# Supabase 연결 마무리

홈페이지 코드는 Supabase 로그인과 데이터 저장 방식으로 연결되어 있습니다. 아래 설정을 완료해야 실제 접수가 시작됩니다.

## 1. 테이블과 보안 규칙 만들기

1. Supabase Dashboard에서 프로젝트를 엽니다.
2. 왼쪽 메뉴에서 **SQL Editor**를 엽니다.
3. `supabase/schema.sql` 파일의 전체 내용을 붙여 넣습니다.
4. **Run**을 누릅니다.

실행 후 Table Editor에 다음 테이블이 표시됩니다.

- `inquiries`: 홈페이지 일반 문의
- `instructor_applications`: 강사 지원서

Storage에는 다음 버킷이 생성됩니다.

- `avatars`: 회원 프로필 사진

웹 방문자는 두 테이블에 새 내용을 접수할 수만 있고 기존 접수 내용은 읽거나 수정할 수 없습니다. 관리자는 Supabase Dashboard의 Table Editor에서 확인합니다.

## 2. 회원가입 주소 설정하기

Supabase Dashboard에서 **Authentication > URL Configuration**을 엽니다.

- **Site URL**에는 사용자가 실제로 접속하는 홈페이지 주소를 입력합니다. 예: `https://example.com`
- **Redirect URLs**에는 실제 홈페이지의 `https://example.com/auth-callback.html`을 추가합니다.
- Vercel 미리보기 주소도 사용한다면 해당 주소의 `auth-callback.html`을 각각 추가합니다.
- 로컬 확인을 위해 `http://localhost:8000/auth-callback.html`도 추가합니다.

`example.com`은 반드시 실제 배포 도메인으로 바꿔야 합니다. 이 설정이 localhost 또는 이전 배포 주소로 남아 있으면 이메일의 인증 링크에서 "연결할 수 없음"이 표시됩니다.

홈페이지는 회원가입 및 이메일 변경 메일의 도착 지점을 `auth-callback.html`로 지정합니다. Authentication의 이메일 확인 기능이 켜져 있으면 신규 회원은 수신한 링크를 누른 뒤 로그인할 수 있습니다. **Secure email change**가 켜져 있으면 이메일 변경 시 기존 주소와 새 주소 양쪽에 확인 메일이 전송될 수 있으며, 두 메일의 확인이 모두 필요합니다.

## 3. 가입 확인 메일 설정하기

Supabase Auth의 이메일 확인 기능을 사용하는 경우에만 아래 템플릿을 설정합니다. 이 메일은 계정 인증용이며, Resend 환영메일과는 별도로 동작합니다.

1. Supabase Dashboard에서 **Authentication > Email Templates > Confirm signup**을 엽니다.
2. 제목을 `[마이에듀케이션] 이메일 인증을 완료해 주세요`로 입력합니다.
3. `supabase/welcome-email-template.html`의 전체 내용을 본문에 붙여 넣고 저장합니다.
4. Authentication의 이메일 확인 기능이 켜져 있는지 확인합니다.

이 템플릿의 `{{ .ConfirmationURL }}`은 Supabase가 실제 인증 주소로 자동 치환합니다.

## 4. Resend 회원가입 환영메일 설정하기

회원가입 성공 후 발송되는 별도의 환영메일은 Supabase Edge Function과 Resend로 처리합니다. 브라우저의 `script.js`에서는 Resend를 호출하지 않습니다.

전체 배포 및 Secret·Database Webhook 설정 방법은 `supabase/WELCOME_EMAIL_SETUP.md`를 확인하세요.

## 5. Vercel에 배포하기

Vercel 프로젝트 설정에서 **Root Directory**를 `홈페이지 제작`으로 지정합니다. 별도의 Build Command는 필요하지 않습니다.

배포한 다음 아래 순서로 확인합니다.

1. 새 이메일로 회원가입
2. 이메일 확인 후 로그인
3. 새로고침 후 로그인 유지 확인
4. 헤더의 프로필 이미지를 눌러 마이페이지 이동
5. 프로필 사진 업로드 및 회원정보 수정 확인
6. 일반 문의 제출 후 `inquiries` 테이블 확인
7. 강사 지원 제출 후 `instructor_applications` 테이블 확인

## 6. 문의 이메일 알림

현재 단계에서는 문의와 지원서가 Supabase에 안전하게 저장됩니다. 담당자 이메일로 자동 알림을 보내려면 다음 단계에서 Resend 또는 Supabase Database Webhook을 추가로 연결해야 합니다. 이메일 발송용 비밀 키는 절대로 `supabase-client.js`에 넣지 말고 서버 환경변수로만 보관해야 합니다.
