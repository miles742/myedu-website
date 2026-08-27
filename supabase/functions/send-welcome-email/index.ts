const RESEND_ENDPOINT = "https://api.resend.com/emails";

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function isValidEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function welcomeEmailHtml(name) {
  const safeName = escapeHtml(name || "회원");
  return `<!doctype html>
<html lang="ko">
<body style="margin:0;padding:0;background:#f3f7fb;font-family:Arial,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#17233b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7fb;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border:1px solid #e4ebf2;border-radius:22px;overflow:hidden;box-shadow:0 18px 55px rgba(28,60,91,.10);">
          <tr><td style="height:8px;background:#1769aa;"></td></tr>
          <tr>
            <td style="padding:44px 38px 40px;">
              <p style="margin:0 0 12px;color:#1769aa;font-size:12px;font-weight:700;letter-spacing:1.5px;">MY EDUCATION</p>
              <h1 style="margin:0 0 22px;font-size:28px;line-height:1.45;color:#17233b;">${safeName}님, 반갑습니다!</h1>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.8;color:#4f5e73;">(주)마이에듀케이션 회원가입을 환영합니다.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.8;color:#4f5e73;">다양한 교육 프로그램과 소식을 확인해보세요.</p>
              <p style="margin:0;font-size:16px;line-height:1.8;color:#4f5e73;">교육문의는 언제나 환영입니다^^</p>
              <div style="height:1px;margin:32px 0 22px;background:#e7edf3;"></div>
              <p style="margin:0;color:#8a94a3;font-size:12px;line-height:1.7;">본 메일은 마이에듀 홈페이지 회원가입 완료 후 자동 발송되었습니다.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const webhookSecret = Deno.env.get("WELCOME_WEBHOOK_SECRET");

  if (!resendApiKey || !fromEmail || !webhookSecret) {
    console.error("Required Edge Function secrets are not configured.");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  if (request.headers.get("x-webhook-secret") !== webhookSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let payload;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 20_000) return jsonResponse({ error: "Payload too large" }, 413);
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  if (
    payload.type !== "INSERT" ||
    payload.schema !== "public" ||
    payload.table !== "member_signup_events" ||
    !payload.record
  ) {
    return jsonResponse({ error: "Unsupported webhook event" }, 400);
  }

  const userId = String(payload.record.user_id || "");
  const email = String(payload.record.email || "").trim().toLowerCase();
  const name = String(payload.record.name || "회원").trim().slice(0, 100) || "회원";

  if (!/^[0-9a-f-]{36}$/i.test(userId) || !isValidEmail(email)) {
    return jsonResponse({ error: "Invalid signup record" }, 400);
  }

  const resendResponse = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `welcome-${userId}`,
    },
    body: JSON.stringify({
      from: `마이에듀 <${fromEmail}>`,
      to: [email],
      subject: "[마이에듀] 회원가입을 환영합니다!",
      html: welcomeEmailHtml(name),
      text: `${name}님, 반갑습니다!\n\n(주)마이에듀케이션 회원가입을 환영합니다.\n다양한 교육 프로그램과 소식을 확인해보세요.\n교육문의는 언제나 환영입니다^^`,
    }),
  });

  const resendResult = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) {
    console.error("Resend rejected the welcome email request.", resendResponse.status, resendResult);
    return jsonResponse({ error: "Email delivery request failed" }, 502);
  }

  return jsonResponse({ sent: true, id: resendResult.id });
});
