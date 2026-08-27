# 회원가입 환영메일 설정

이 구성은 브라우저에서 이메일 API를 호출하지 않습니다.

`Supabase Auth 회원 생성 성공 → member_signup_events INSERT → Database Webhook → send-welcome-email Edge Function → Resend`

회원 생성이 실패하면 `auth.users` INSERT와 이벤트 행이 생기지 않으므로 환영메일도 발송되지 않습니다.

## 1. Resend 준비

1. Resend에서 발송 도메인을 등록하고 DNS 인증을 완료합니다.
2. Resend API Key를 생성합니다.
3. 인증한 도메인에 속하는 발신 주소를 정합니다. 예: `hello@myedu.co.kr`

Resend 시험용 주소인 `onboarding@resend.dev`는 Resend 계정 소유자의 이메일 등 제한된 수신자에게만 테스트할 때 사용합니다. 실제 회원에게 보내려면 반드시 발송 도메인을 인증하세요.

## 2. Supabase 스키마 적용

Supabase Dashboard의 **SQL Editor**에서 `supabase/schema.sql` 전체를 실행합니다. 기존 문의·프로필 설정을 유지하면서 아래 항목이 추가됩니다.

- `public.member_signup_events` 테이블
- `auth.users` INSERT 이후 실행되는 `on_auth_user_created_send_welcome` 트리거
- 브라우저의 이벤트 테이블 접근을 막는 RLS 및 권한 설정

## 3. Edge Function Secret 등록

Supabase Dashboard의 **Edge Functions > Secrets**에서 다음 값을 등록합니다.

- `RESEND_API_KEY`: Resend에서 발급한 API Key
- `RESEND_FROM_EMAIL`: Resend에서 인증된 발신 주소
- `WELCOME_WEBHOOK_SECRET`: 직접 생성한 충분히 긴 임의 문자열

CLI를 사용한다면 다음과 같이 등록할 수 있습니다.

```powershell
supabase secrets set RESEND_API_KEY=re_xxxxx RESEND_FROM_EMAIL=hello@your-domain.com WELCOME_WEBHOOK_SECRET=충분히-긴-임의문자열
```

Secret 값은 `.env`, JavaScript, SQL 또는 Git 저장소에 넣지 않습니다.

## 4. Edge Function 배포

프로젝트 폴더에서 Supabase CLI로 로그인하고 프로젝트를 연결한 다음 배포합니다.

```powershell
supabase login
supabase link --project-ref rmhbnquzuerwaysinqfw
supabase functions deploy send-welcome-email --no-verify-jwt
```

`verify_jwt = false`인 이유는 브라우저 공개 호출용이 아니라 Database Webhook 수신용이기 때문입니다. 함수 내부에서 `x-webhook-secret`을 Secret과 비교하여 요청을 검증합니다.

## 5. Database Webhook 만들기

Edge Function Secret은 PostgreSQL에서 직접 읽을 수 없으므로, `WELCOME_WEBHOOK_SECRET`과 같은 값을 Supabase Vault에도 `WELCOME_WEBHOOK_SECRET`이라는 이름으로 한 번 저장합니다. 실제 비밀값은 웹훅 함수나 트리거 정의에 직접 넣지 않습니다.

그다음 SQL Editor에서 `supabase/create-welcome-webhook.sql` 전체를 실행합니다. 이 SQL은 최신 `pg_net` 비동기 POST 방식으로 Edge Function을 호출합니다. 같은 이름의 기존 웹훅 트리거를 제거한 후 하나만 다시 만들기 때문에 여러 번 실행해도 중복 생성되지 않습니다.

전송되는 HTTP Header는 다음과 같습니다.

```text
Content-Type: application/json
x-webhook-secret: Vault의 WELCOME_WEBHOOK_SECRET 값
```

## 6. Resend 발신자 확인

Edge Function은 다음 발신자 형식을 사용합니다.

```text
마이에듀 <RESEND_FROM_EMAIL>
```

메일 제목은 `[마이에듀] 회원가입을 환영합니다!`이며 HTML 본문과 일반 텍스트 본문을 함께 전송합니다.

## 7. 최종 테스트

1. 기존에 등록되지 않은 새 이메일로 홈페이지 회원가입을 진행합니다.
2. Supabase **Authentication > Users**에서 회원이 생성됐는지 확인합니다.
3. **Table Editor > member_signup_events**에 동일한 회원 ID의 행이 한 개 생성됐는지 확인합니다.
4. **Edge Functions > send-welcome-email > Logs**에서 HTTP 200 응답을 확인합니다.
5. Resend의 Emails 로그와 가입 이메일의 받은편지함·스팸함을 확인합니다.

동일한 회원 이벤트가 중복 호출되더라도 Edge Function은 회원 ID 기반 `Idempotency-Key`를 Resend에 전달하여 중복 발송을 방지합니다.
