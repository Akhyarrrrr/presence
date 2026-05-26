create extension if not exists "uuid-ossp";

create table public.departments (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now()
);

insert into public.departments (name) values
  ('Engineering'),
  ('Design'),
  ('Marketing'),
  ('HR'),
  ('Finance'),
  ('Operations');

create table public.members (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  employee_id text unique not null,
  department_id uuid references public.departments on delete set null,
  email text,
  photo_url text,
  face_descriptor float8[] not null,
  is_active boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.attendance_logs (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references public.members on delete cascade not null,
  check_in_at timestamptz default now() not null,
  confidence float8 not null,
  date date default current_date not null,
  created_at timestamptz default now() not null
);

create unique index attendance_member_date_unique
  on public.attendance_logs (member_id, date);

alter table public.departments enable row level security;
alter table public.members enable row level security;
alter table public.attendance_logs enable row level security;

create policy "Public read departments" on public.departments for select using (true);
create policy "Public read members" on public.members for select using (true);
create policy "Authenticated manage members" on public.members for all using (auth.role() = 'authenticated');
create policy "Public read attendance" on public.attendance_logs for select using (true);
create policy "Public insert attendance" on public.attendance_logs for insert with check (true);
create policy "Authenticated manage attendance" on public.attendance_logs for all using (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', true)
on conflict (id) do nothing;

create policy "Member photos publicly accessible"
  on storage.objects for select using (bucket_id = 'member-photos');

create policy "Authenticated can upload photos"
  on storage.objects for insert
  with check (bucket_id = 'member-photos' and auth.role() = 'authenticated');
