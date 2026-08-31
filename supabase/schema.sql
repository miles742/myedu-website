-- Supabase Dashboard > SQL Editor에서 이 파일 전체를 한 번 실행하세요.
-- 문의/지원 테이블, 회원가입 이벤트, 회원 프로필 사진 저장소를 설정합니다.
-- 문의/지원 데이터는 웹사이트에서 INSERT만 가능하고, 조회/수정/삭제는 Dashboard에서만 가능합니다.

create extension if not exists pgcrypto;

create table if not exists public.inquiries (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    organization text not null check (char_length(organization) between 1 and 120),
    name text not null check (char_length(name) between 2 and 30),
    email text not null check (char_length(email) <= 254),
    phone text not null check (char_length(phone) between 9 and 20),
    program text not null check (char_length(program) <= 80),
    preferred_schedule text check (char_length(preferred_schedule) <= 120),
    message text not null check (char_length(message) between 1 and 3000),
    consent boolean not null check (consent = true),
    status text not null default 'received' check (status in ('received', 'reviewing', 'completed')),
    created_at timestamptz not null default now()
);

create table if not exists public.instructor_applications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    name text not null check (char_length(name) between 2 and 30),
    phone text not null check (char_length(phone) between 9 and 20),
    email text not null check (char_length(email) <= 254),
    field text not null check (char_length(field) <= 80),
    career_years integer not null check (career_years between 0 and 60),
    region text not null check (char_length(region) <= 80),
    available_schedule text not null check (char_length(available_schedule) <= 120),
    resume_url text check (resume_url is null or char_length(resume_url) <= 500),
    introduction text not null check (char_length(introduction) between 30 and 2000),
    consent boolean not null check (consent = true),
    status text not null default 'received' check (status in ('received', 'reviewing', 'interview', 'completed')),
    created_at timestamptz not null default now()
);

-- Auth 회원 생성이 성공한 경우에만 한 행이 만들어집니다.
-- 이 테이블의 INSERT Database Webhook이 환영메일 Edge Function을 호출합니다.
create table if not exists public.member_signup_events (
    user_id uuid primary key references auth.users(id) on delete cascade,
    email text not null check (char_length(email) <= 254),
    name text not null default '회원' check (char_length(name) between 1 and 100),
    site text not null default 'myeducation' check (site in ('myeducation', 'l2k')),
    created_at timestamptz not null default now()
);

alter table public.member_signup_events
    add column if not exists site text not null default 'myeducation';

create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);
create index if not exists instructor_applications_created_at_idx on public.instructor_applications (created_at desc);

alter table public.inquiries enable row level security;
alter table public.instructor_applications enable row level security;
alter table public.member_signup_events enable row level security;

revoke all on table public.inquiries from anon, authenticated;
revoke all on table public.instructor_applications from anon, authenticated;
revoke all on table public.member_signup_events from anon, authenticated;
grant insert on table public.inquiries to anon, authenticated;
grant insert on table public.instructor_applications to anon, authenticated;

drop policy if exists "Visitors can submit inquiries" on public.inquiries;
create policy "Visitors can submit inquiries"
on public.inquiries for insert to anon
with check (user_id is null and consent = true);

drop policy if exists "Members can submit inquiries" on public.inquiries;
create policy "Members can submit inquiries"
on public.inquiries for insert to authenticated
with check ((select auth.uid()) = user_id and consent = true);

drop policy if exists "Visitors can submit instructor applications" on public.instructor_applications;
create policy "Visitors can submit instructor applications"
on public.instructor_applications for insert to anon
with check (user_id is null and consent = true);

drop policy if exists "Members can submit instructor applications" on public.instructor_applications;
create policy "Members can submit instructor applications"
on public.instructor_applications for insert to authenticated
with check ((select auth.uid()) = user_id and consent = true);

-- 브라우저가 아닌 Auth 시스템만 회원가입 이벤트를 생성합니다.
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

drop trigger if exists on_auth_user_created_send_welcome on auth.users;
create trigger on_auth_user_created_send_welcome
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- 회원 프로필 사진용 공개 버킷입니다. 파일 수정과 삭제는 본인 폴더에서만 가능합니다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects for select to public
using (bucket_id = 'avatars');

drop policy if exists "Members can upload their avatar" on storage.objects;
create policy "Members can upload their avatar"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Members can update their avatar" on storage.objects;
create policy "Members can update their avatar"
on storage.objects for update to authenticated
using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Members can delete their avatar" on storage.objects;
create policy "Members can delete their avatar"
on storage.objects for delete to authenticated
using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- 이름과 연락처가 모두 일치할 때 로그인 아이디(이메일)를 일부 가려서 반환합니다.
-- 원문 이메일을 노출하지 않아 계정 조회 악용 가능성을 줄입니다.
create or replace function public.find_member_email(p_name text, p_phone text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    found_email text;
    local_part text;
    domain_part text;
begin
    if char_length(trim(coalesce(p_name, ''))) < 2
       or char_length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 9 then
        return null;
    end if;

    select lower(user_record.email)
      into found_email
      from auth.users as user_record
     where lower(trim(user_record.raw_user_meta_data ->> 'name')) = lower(trim(p_name))
       and regexp_replace(coalesce(user_record.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g')
           = regexp_replace(p_phone, '\D', '', 'g')
     order by user_record.created_at desc
     limit 1;

    if found_email is null then return null; end if;
    local_part := split_part(found_email, '@', 1);
    domain_part := split_part(found_email, '@', 2);
    return left(local_part, least(2, char_length(local_part)))
        || repeat('*', greatest(char_length(local_part) - 2, 1))
        || '@' || domain_part;
end;
$$;

revoke all on function public.find_member_email(text, text) from public;
grant execute on function public.find_member_email(text, text) to anon, authenticated;

-- 로그인한 회원이 본인 계정만 직접 탈퇴할 수 있습니다.
create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid := auth.uid();
begin
    if current_user_id is null then
        raise exception '로그인이 필요합니다.';
    end if;

    delete from storage.objects
     where bucket_id = 'avatars'
       and (storage.foldername(name))[1] = current_user_id::text;
    delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_current_user() from public, anon;
grant execute on function public.delete_current_user() to authenticated;
