-- Supabase SQL Editor에서 실행하세요.
-- 사전 조건:
--   1) public.member_signup_events 테이블이 존재해야 합니다.
--   2) Supabase Vault에 name='WELCOME_WEBHOOK_SECRET'인 Secret이 존재해야 합니다.
--   3) 해당 Secret의 값은 Edge Function Secret WELCOME_WEBHOOK_SECRET과 같아야 합니다.

create schema if not exists extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.invoke_send_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    webhook_secret text;
    request_id bigint;
begin
    select decrypted_secret
      into webhook_secret
      from vault.decrypted_secrets
     where name = 'WELCOME_WEBHOOK_SECRET'
     order by updated_at desc
     limit 1;

    if webhook_secret is null or webhook_secret = '' then
        raise warning 'Welcome email webhook skipped: Vault secret WELCOME_WEBHOOK_SECRET is missing.';
        return new;
    end if;

    select net.http_post(
        url := 'https://rmhbnquzuerwaysinqfw.supabase.co/functions/v1/send-welcome-email',
        body := jsonb_build_object(
            'type', 'INSERT',
            'table', tg_table_name,
            'schema', tg_table_schema,
            'record', to_jsonb(new),
            'old_record', null
        ),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-webhook-secret', webhook_secret
        ),
        timeout_milliseconds := 5000
    ) into request_id;

    return new;
exception
    when others then
        -- 환영메일 호출 장애가 실제 회원가입을 취소하지 않도록 경고만 남깁니다.
        raise warning 'Welcome email webhook request failed: %', sqlerrm;
        return new;
end;
$$;

revoke all on function public.invoke_send_welcome_email() from public, anon, authenticated;

-- 이름이 다르더라도 같은 함수 또는 같은 Edge Function URL을 사용하는 기존 트리거를 제거합니다.
do $$
declare
    existing_trigger record;
begin
    for existing_trigger in
        select trigger_info.tgname
          from pg_catalog.pg_trigger as trigger_info
         where trigger_info.tgrelid = 'public.member_signup_events'::regclass
           and not trigger_info.tgisinternal
           and (
               trigger_info.tgfoid = 'public.invoke_send_welcome_email()'::regprocedure
               or pg_catalog.pg_get_triggerdef(trigger_info.oid) ilike '%send-welcome-email%'
           )
    loop
        execute format(
            'drop trigger if exists %I on public.member_signup_events',
            existing_trigger.tgname
        );
    end loop;
end;
$$;

-- 앞서 안내한 이름까지 명시적으로 정리합니다. 여러 번 실행해도 중복 생성되지 않습니다.
drop trigger if exists "send-welcome-email-on-signup" on public.member_signup_events;
drop trigger if exists send_welcome_email_webhook on public.member_signup_events;

create trigger send_welcome_email_webhook
after insert on public.member_signup_events
for each row
execute function public.invoke_send_welcome_email();

comment on function public.invoke_send_welcome_email() is
'Calls the send-welcome-email Edge Function through pg_net after a successful Auth signup event.';

comment on trigger send_welcome_email_webhook on public.member_signup_events is
'Sends one asynchronous welcome-email webhook for each newly created member signup event.';

-- 마지막 결과가 한 행이면 웹훅 트리거가 정상 생성된 것입니다.
select trigger_name, event_manipulation, action_timing
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'member_signup_events'
  and trigger_name = 'send_welcome_email_webhook';
