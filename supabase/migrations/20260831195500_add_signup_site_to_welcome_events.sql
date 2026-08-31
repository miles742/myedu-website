alter table public.member_signup_events
    add column if not exists site text not null default 'myeducation';

do $$
begin
    if not exists (
        select 1
          from pg_catalog.pg_constraint
         where conname = 'member_signup_events_site_check'
           and conrelid = 'public.member_signup_events'::regclass
    ) then
        alter table public.member_signup_events
            add constraint member_signup_events_site_check
            check (site in ('myeducation', 'l2k'));
    end if;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.email is not null then
        insert into public.member_signup_events (user_id, email, name, site)
        values (
            new.id,
            lower(new.email),
            coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), '회원'),
            case
                when new.raw_user_meta_data ->> 'signup_source' = 'l2k' then 'l2k'
                else 'myeducation'
            end
        )
        on conflict (user_id) do nothing;
    end if;
    return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

comment on column public.member_signup_events.site is
'Signup website used to select the correct welcome-email brand.';
