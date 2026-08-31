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
        raise warning 'Welcome email webhook request failed: %', sqlerrm;
        return new;
end;
$$;

revoke all on function public.invoke_send_welcome_email() from public, anon, authenticated;

drop trigger if exists send_welcome_email_webhook on public.member_signup_events;

create trigger send_welcome_email_webhook
after insert on public.member_signup_events
for each row
execute function public.invoke_send_welcome_email();

comment on function public.invoke_send_welcome_email() is
'Calls the brand-aware send-welcome-email Edge Function through pg_net after a successful Auth signup event.';

comment on trigger send_welcome_email_webhook on public.member_signup_events is
'Sends one asynchronous welcome-email webhook for each newly created member signup event.';
