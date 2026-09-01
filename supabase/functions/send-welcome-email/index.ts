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

function normalizeSite(value) {
  return value === "l2k" || value === "myeducation" ? value : "myeducation";
}

function welcomeEmailHtml(name, site) {
  const safeName = escapeHtml(name || "회원");
  const isL2k = site === "l2k";
  const brandName = isL2k ? "L2K EDU" : "MY EDUCATION";
  const accentColor = isL2k ? "#b7892f" : "#1769aa";
  const headingColor = isL2k ? "#2c2418" : "#17233b";
  const backgroundColor = isL2k ? "#f7f4ec" : "#f3f7fb";
  const welcomeMessage = isL2k
    ? "L2K EDU 가입을 진심으로 환영합니다."
    : "(주)마이에듀케이션 회원가입을 환영합니다.";
  const serviceMessage = isL2k
    ? "한국 대학과 글로벌 인재를 연결하는 교육·유학생 서비스를 이용하실 수 있습니다."
    : "다양한 교육 프로그램과 소식을 확인해보세요.";
  const footerMessage = isL2k
    ? "본 메일은 L2K EDU 홈페이지 회원가입 완료 후 자동 발송되었습니다."
    : "본 메일은 마이에듀 홈페이지 회원가입 완료 후 자동 발송되었습니다.";
  const brandHeader = isL2k
    ? `<img src="https://www.l2kedu.cloud/5_L2K_Edu_%EB%A1%9C%EA%B3%A0_1.png" width="124" alt="L2K EDU" style="display:block;width:124px;max-width:100%;height:auto;margin:0 0 18px;border:0;">
              <p style="margin:0 0 12px;color:${accentColor};font-size:12px;font-weight:700;letter-spacing:1.5px;">L2K EDU</p>`
    : `<p style="margin:0 0 12px;color:${accentColor};font-size:12px;font-weight:700;letter-spacing:1.5px;">${brandName}</p>`;
  return `<!doctype html>
<html lang="ko">
<body style="margin:0;padding:0;background:${backgroundColor};font-family:Arial,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:${headingColor};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${backgroundColor};padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border:1px solid #e4ebf2;border-radius:22px;overflow:hidden;box-shadow:0 18px 55px rgba(28,60,91,.10);">
          <tr><td style="height:8px;background:${accentColor};"></td></tr>
          <tr>
            <td style="padding:44px 38px 40px;">
              ${brandHeader}
              <h1 style="margin:0 0 22px;font-size:28px;line-height:1.45;color:${headingColor};">${safeName}님, 반갑습니다!</h1>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.8;color:#4f5e73;">${welcomeMessage}</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.8;color:#4f5e73;">${serviceMessage}</p>
              <p style="margin:0;font-size:16px;line-height:1.8;color:#4f5e73;">교육문의는 언제나 환영입니다^^</p>
              <div style="height:1px;margin:32px 0 22px;background:#e7edf3;"></div>
              <p style="margin:0;color:#8a94a3;font-size:12px;line-height:1.7;">${footerMessage}</p>
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
  const l2kFromEmail = Deno.env.get("L2K_RESEND_FROM_EMAIL");
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
  const site = normalizeSite(payload.record.site);
  const selectedFromEmail = site === "l2k" ? (l2kFromEmail || fromEmail) : fromEmail;

  if (!/^[0-9a-f-]{36}$/i.test(userId) || !isValidEmail(email)) {
    return jsonResponse({ error: "Invalid signup record" }, 400);
  }

  if (!selectedFromEmail) {
    console.error("The selected welcome-email brand has no configured sender address.");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const resendResponse = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `welcome-${userId}`,
    },
    body: JSON.stringify({
      from: `${site === "l2k" ? "L2K EDU" : "마이에듀"} <${selectedFromEmail}>`,
      to: [email],
      subject: site === "l2k"
        ? "L2K EDU에 오신 것을 환영합니다"
        : "[마이에듀] 회원가입을 환영합니다!",
      html: welcomeEmailHtml(name, site),
      text: site === "l2k"
        ? `${name}님, 반갑습니다!\n\nL2K EDU 가입을 진심으로 환영합니다.\n한국 대학과 글로벌 인재를 연결하는 교육·유학생 서비스를 이용하실 수 있습니다.\n교육문의는 언제나 환영입니다^^`
        : `${name}님, 반갑습니다!\n\n(주)마이에듀케이션 회원가입을 환영합니다.\n다양한 교육 프로그램과 소식을 확인해보세요.\n교육문의는 언제나 환영입니다^^`,
    }),
  });

  const resendResult = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) {
    console.error("Resend rejected the welcome email request.", resendResponse.status, resendResult);
    return jsonResponse({ error: "Email delivery request failed" }, 502);
  }

  return jsonResponse({ sent: true, id: resendResult.id });
});
