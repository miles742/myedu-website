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

웹 방문자는 두 테이블에 새 내용을 접수할 수만 있고 기존 접수 내용은 읽거나 수정할 수 없습니다. 관리자는 Supabase Dashboard의 Table Editor에서 확인합니다.

## 2. 회원가입 주소 설정하기

Supabase Dashboard에서 **Authentication > URL Configuration**을 엽니다.

- 시험 배포 중에는 Site URL을 Vercel이 발급한 주소로 설정합니다.
- 도메인을 연결한 후에는 Site URL을 실제 도메인으로 변경합니다.
- 로컬 확인이 필요하면 Redirect URLs에 `http://localhost:8000/**`를 추가합니다.

Authentication의 이메일 확인 기능이 켜져 있으면 신규 회원은 수신한 확인 링크를 누른 뒤 로그인할 수 있습니다.

## 3. Vercel에 배포하기

Vercel 프로젝트 설정에서 **Root Directory**를 `홈페이지 제작`으로 지정합니다. 별도의 Build Command는 필요하지 않습니다.

배포한 다음 아래 순서로 확인합니다.

1. 새 이메일로 회원가입
2. 이메일 확인 후 로그인
3. 새로고침 후 로그인 유지 확인
4. 일반 문의 제출 후 `inquiries` 테이블 확인
5. 강사 지원 제출 후 `instructor_applications` 테이블 확인

## 4. 이메일 알림

현재 단계에서는 문의와 지원서가 Supabase에 안전하게 저장됩니다. 담당자 이메일로 자동 알림을 보내려면 다음 단계에서 Resend 또는 Supabase Database Webhook을 추가로 연결해야 합니다. 이메일 발송용 비밀 키는 절대로 `supabase-client.js`에 넣지 말고 서버 환경변수로만 보관해야 합니다.
