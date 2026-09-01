-- Storage 시스템 테이블을 직접 수정하던 기존 회원탈퇴 RPC는 사용하지 않습니다.
-- 회원탈퇴는 delete-account Edge Function에서 Storage API와 Admin API로 처리합니다.
drop function if exists public.delete_current_user();
