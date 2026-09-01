import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://l2kedu.cloud",
  "https://www.l2kedu.cloud",
  "https://myeducation.kr",
  "https://www.myeducation.kr",
  "https://myedu-website.vercel.app",
  "http://localhost:8000",
]);

const CLEANUP_TABLES = [
  "member_signup_events",
  "inquiries",
  "instructor_applications",
] as const;

type Dependencies = {
  createClientImpl?: typeof createClient;
  getEnv?: (name: string) => string | undefined;
};

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(request: Request, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function removeAvatarFiles(admin: SupabaseClient, userId: string) {
  const bucket = admin.storage.from("avatars");
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await bucket.list(userId, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error("avatar-list-failed");

    const entries = data ?? [];
    for (const entry of entries) {
      if (entry.id) paths.push(`${userId}/${entry.name}`);
    }
    if (entries.length < 100) break;
    offset += entries.length;
  }

  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await bucket.remove(paths.slice(index, index + 100));
    if (error) throw new Error("avatar-remove-failed");
  }
}

export function createDeleteAccountHandler({
  createClientImpl = createClient,
  getEnv = (name) => Deno.env.get(name),
}: Dependencies = {}) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") {
      const origin = request.headers.get("origin");
      if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return json(request, { error: "허용되지 않은 요청입니다." }, 403);
      }
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (request.method !== "POST") {
      return json(request, { error: "지원하지 않는 요청 방식입니다." }, 405);
    }

    const origin = request.headers.get("origin");
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json(request, { error: "허용되지 않은 요청입니다." }, 403);
    }

    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json(request, { error: "로그인이 필요합니다." }, 401);
    }

    let password = "";
    try {
      const contentLength = Number(
        request.headers.get("content-length") || "0",
      );
      if (contentLength > 2048) {
        return json(request, { error: "잘못된 요청입니다." }, 413);
      }
      const body = await request.json();
      password = typeof body?.password === "string" ? body.password : "";
    } catch (_) {
      return json(request, { error: "잘못된 요청입니다." }, 400);
    }
    if (!password || password.length > 256) {
      return json(request, { error: "현재 비밀번호를 입력해 주세요." }, 400);
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const anonKey = getEnv("SUPABASE_ANON_KEY");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("delete-account: required server environment is missing");
      return json(
        request,
        { error: "회원 탈퇴 서비스를 사용할 수 없습니다." },
        500,
      );
    }

    const clientOptions = {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    };
    const caller = createClientImpl(supabaseUrl, anonKey, {
      ...clientOptions,
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userError } = await caller.auth.getUser();
    const user = userData.user;
    if (userError || !user?.id || !user.email) {
      return json(
        request,
        { error: "로그인 정보를 확인하지 못했습니다." },
        401,
      );
    }

    const verifier = createClientImpl(supabaseUrl, anonKey, clientOptions);
    const { data: verification, error: verificationError } = await verifier.auth
      .signInWithPassword({ email: user.email, password });
    if (verificationError || verification.user?.id !== user.id) {
      return json(
        request,
        { error: "현재 비밀번호가 올바르지 않습니다." },
        403,
      );
    }

    const admin = createClientImpl(supabaseUrl, serviceRoleKey, clientOptions);
    try {
      await removeAvatarFiles(admin, user.id);

      for (const table of CLEANUP_TABLES) {
        const { error } = await admin.from(table).delete().eq(
          "user_id",
          user.id,
        );
        if (error) throw new Error(`${table}-cleanup-failed`);
      }

      const { error: deleteUserError } = await admin.auth.admin.deleteUser(
        user.id,
      );
      if (deleteUserError) throw new Error("auth-delete-failed");
    } catch (error) {
      console.error(
        "delete-account cleanup failed:",
        error instanceof Error ? error.message : "unknown",
      );
      return json(request, {
        error:
          "회원 데이터 정리 중 오류가 발생했습니다. 계정은 삭제되지 않았습니다.",
      }, 500);
    }

    return json(request, { deleted: true }, 200);
  };
}

if (import.meta.main) {
  Deno.serve(createDeleteAccountHandler());
}
