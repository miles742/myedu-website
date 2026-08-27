-- Supabase Dashboard > SQL Editor에서 이 파일 전체를 한 번 실행하세요.
-- 두 테이블은 웹사이트에서 INSERT만 가능하고, 조회/수정/삭제는 Dashboard에서만 가능합니다.

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

create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);
create index if not exists instructor_applications_created_at_idx on public.instructor_applications (created_at desc);

alter table public.inquiries enable row level security;
alter table public.instructor_applications enable row level security;

revoke all on table public.inquiries from anon, authenticated;
revoke all on table public.instructor_applications from anon, authenticated;
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
