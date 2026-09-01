alter table public.member_signup_events
    add column if not exists site text default 'myeducation';

update public.member_signup_events
   set site = 'myeducation'
 where site is null
    or site not in ('l2k', 'myeducation');

alter table public.member_signup_events
    alter column site set default 'myeducation',
    alter column site set not null;

alter table public.member_signup_events
    drop constraint if exists member_signup_events_site_check;

alter table public.member_signup_events
    add constraint member_signup_events_site_check
    check (site in ('l2k', 'myeducation'));

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    signup_site text;
begin
    if new.email is not null then
        signup_site := case
            when new.raw_user_meta_data ->> 'signup_source' = 'l2k' then 'l2k'
            when new.raw_user_meta_data ->> 'signup_source' = 'myeducation' then 'myeducation'
            else 'myeducation'
        end;

        insert into public.member_signup_events (user_id, email, name, site)
        values (
            new.id,
            lower(new.email),
            coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), '회원'),
            signup_site
        )
        on conflict (user_id) do nothing;
    end if;
    return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_send_welcome on auth.users;
create trigger on_auth_user_created_send_welcome
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

comment on column public.member_signup_events.site is
'Allowlisted signup brand used only to select the welcome-email presentation.';
