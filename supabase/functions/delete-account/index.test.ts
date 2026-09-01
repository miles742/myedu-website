import { createDeleteAccountHandler } from "./index.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

type MockOptions = {
  invalidJwt?: boolean;
  wrongPassword?: boolean;
  storageError?: boolean;
  failingTable?: string;
};

function setup(options: MockOptions = {}) {
  const callerId = "11111111-1111-4111-8111-111111111111";
  const calls: string[] = [];
  const admin = {
    storage: {
      from: () => ({
        list: async (folder: string) => {
          calls.push(`storage-list:${folder}`);
          if (options.storageError) {
            return { data: null, error: new Error("storage") };
          }
          return { data: [{ id: "object-id", name: "avatar" }], error: null };
        },
        remove: async (paths: string[]) => {
          calls.push(`storage-remove:${paths.join(",")}`);
          return { error: null };
        },
      }),
    },
    from: (table: string) => ({
      delete: () => ({
        eq: async (_column: string, userId: string) => {
          calls.push(`table-delete:${table}:${userId}`);
          return {
            error: options.failingTable === table ? new Error("table") : null,
          };
        },
      }),
    }),
    auth: {
      admin: {
        deleteUser: async (userId: string) => {
          calls.push(`auth-delete:${userId}`);
          return { error: null };
        },
      },
    },
  };

  const createClientImpl = (
    _url: string,
    key: string,
    clientOptions: Record<string, unknown>,
  ) => {
    if (key === "service-role") return admin;
    if ("global" in clientOptions) {
      return {
        auth: {
          getUser: async () => {
            calls.push("jwt-get-user");
            if (options.invalidJwt) {
              return { data: { user: null }, error: new Error("jwt") };
            }
            return {
              data: { user: { id: callerId, email: "member@example.com" } },
              error: null,
            };
          },
        },
      };
    }
    return {
      auth: {
        signInWithPassword: async () => {
          calls.push("password-reauth");
          return options.wrongPassword
            ? { data: { user: null }, error: new Error("password") }
            : { data: { user: { id: callerId } }, error: null };
        },
      },
    };
  };

  const handler = createDeleteAccountHandler({
    createClientImpl: createClientImpl as never,
    getEnv: (name) =>
      ({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_ANON_KEY: "anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
      })[name],
  });
  const request = () =>
    new Request("https://example.supabase.co/functions/v1/delete-account", {
      method: "POST",
      headers: {
        authorization: "Bearer caller-jwt",
        origin: "https://l2kedu.cloud",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        password: "correct-password",
        userId: "attacker-selected-id",
      }),
    });
  return { callerId, calls, handler, request };
}

Deno.test("uses the JWT caller and deletes Auth last", async () => {
  const { callerId, calls, handler, request } = setup();
  const response = await handler(request());
  assert(response.status === 200, `expected 200, received ${response.status}`);
  assert(
    calls.at(-1) === `auth-delete:${callerId}`,
    "Auth user must be deleted last",
  );
  assert(
    calls.every((call) => !call.includes("attacker-selected-id")),
    "request body user id must be ignored",
  );
  assert(
    calls.includes(`storage-remove:${callerId}/avatar`),
    "avatar must be removed through Storage API",
  );
  for (
    const table of [
      "member_signup_events",
      "inquiries",
      "instructor_applications",
    ]
  ) {
    assert(
      calls.includes(`table-delete:${table}:${callerId}`),
      `${table} must be cleaned up`,
    );
  }
});

Deno.test("does not delete data when JWT validation fails", async () => {
  const { calls, handler, request } = setup({ invalidJwt: true });
  const response = await handler(request());
  assert(response.status === 401, `expected 401, received ${response.status}`);
  assert(
    !calls.some((call) =>
      call.startsWith("storage-") || call.startsWith("table-delete") ||
      call.startsWith("auth-delete")
    ),
    "cleanup must not start",
  );
});

Deno.test("does not delete data when password reauthentication fails", async () => {
  const { calls, handler, request } = setup({ wrongPassword: true });
  const response = await handler(request());
  assert(response.status === 403, `expected 403, received ${response.status}`);
  assert(
    !calls.some((call) =>
      call.startsWith("storage-") || call.startsWith("table-delete") ||
      call.startsWith("auth-delete")
    ),
    "cleanup must not start",
  );
});

Deno.test("keeps Auth user when Storage cleanup fails", async () => {
  const { calls, handler, request } = setup({ storageError: true });
  const response = await handler(request());
  assert(response.status === 500, `expected 500, received ${response.status}`);
  assert(
    !calls.some((call) => call.startsWith("auth-delete")),
    "Auth user must remain",
  );
});

Deno.test("keeps Auth user when a public table cleanup fails", async () => {
  const { calls, handler, request } = setup({ failingTable: "inquiries" });
  const response = await handler(request());
  assert(response.status === 500, `expected 500, received ${response.status}`);
  assert(
    !calls.some((call) => call.startsWith("auth-delete")),
    "Auth user must remain",
  );
});
