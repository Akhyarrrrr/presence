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

-- Phase 1: Organization/Admin foundation.
-- This section is intentionally additive and idempotent. It keeps existing
-- public kiosk reads/inserts working while preparing organization-scoped data.
create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

insert into public.organizations (name, timezone)
values ('Default Organization', 'Asia/Jakarta')
on conflict (name) do update
  set timezone = coalesce(public.organizations.timezone, excluded.timezone);

create or replace function public.default_organization_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select id
  from public.organizations
  where name = 'Default Organization'
  order by created_at asc
  limit 1
$$;

create table if not exists public.admin_users (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade default public.default_organization_id(),
  role text not null default 'owner' check (role in ('owner', 'admin', 'viewer')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, organization_id)
);

alter table public.members
  add column if not exists organization_id uuid references public.organizations(id) on delete set null default public.default_organization_id();

alter table public.attendance_logs
  add column if not exists organization_id uuid references public.organizations(id) on delete set null default public.default_organization_id();

update public.members
set organization_id = public.default_organization_id()
where organization_id is null;

update public.attendance_logs
set organization_id = public.default_organization_id()
where organization_id is null;

insert into public.admin_users (user_id, organization_id, role)
select auth.users.id, public.default_organization_id(), 'owner'
from auth.users
where public.default_organization_id() is not null
on conflict (user_id, organization_id) do nothing;

create index if not exists members_organization_id_idx
  on public.members (organization_id);

create index if not exists attendance_logs_organization_date_idx
  on public.attendance_logs (organization_id, date);

create index if not exists admin_users_user_id_idx
  on public.admin_users (user_id);

create index if not exists admin_users_organization_id_idx
  on public.admin_users (organization_id);

alter table public.organizations enable row level security;
alter table public.admin_users enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_users'
      and policyname = 'Authenticated users read own admin profile'
  ) then
    create policy "Authenticated users read own admin profile"
      on public.admin_users for select
      using (user_id = auth.uid());
  end if;
end
$$;

-- Phase 11: RLS lockdown migration.
-- This section removes broad public table access and shifts kiosk operations to
-- security-definer RPC functions consumed by server routes.

create or replace function public.kiosk_active_members()
returns table (
  id uuid,
  organization_id uuid,
  name text,
  employee_id text,
  photo_url text
)
language sql
security definer
set search_path = public
as $$
  select m.id, m.organization_id, m.name, m.employee_id, m.photo_url
  from public.members m
  where m.is_active = true
  order by m.name asc
$$;

create or replace function public.kiosk_today_checked_in()
returns table (
  member_id uuid
)
language sql
security definer
set search_path = public
as $$
  select al.member_id
  from public.attendance_logs al
  where al.date = current_date
$$;

create or replace function public.secure_match_member_by_face(
  query_embedding vector(128),
  match_threshold float
)
returns table (
  member_id uuid,
  organization_id uuid,
  member_name text,
  employee_id text,
  photo_url text,
  distance float
)
language sql
security definer
set search_path = public
as $$
  select
    m.id as member_id,
    m.organization_id,
    m.name as member_name,
    m.employee_id,
    m.photo_url,
    (mfd.descriptor <-> query_embedding)::float as distance
  from public.member_face_descriptors mfd
  join public.members m on m.id = mfd.member_id
  where m.is_active = true
    and (mfd.descriptor <-> query_embedding) <= match_threshold
  order by mfd.descriptor <-> query_embedding asc
  limit 1
$$;

create or replace function public.secure_attendance_check_in(
  p_member_id uuid,
  p_confidence float,
  p_liveness_verified boolean
)
returns table (
  status text,
  late_minutes integer,
  shift_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_member_id uuid;
  v_member_organization_id uuid;
  v_assigned_shift_id uuid;
  v_shift_id uuid;
  v_shift_start_time time;
  v_shift_tolerance_minutes integer;
  v_shift_very_late_after_minutes integer;
  v_late_minutes integer := 0;
  v_status text := 'no_shift';
begin
  if p_liveness_verified is distinct from true then
    raise exception 'liveness verification is required';
  end if;

  select m.id, m.organization_id
  into v_member_id, v_member_organization_id
  from public.members m
  where m.id = p_member_id and m.is_active = true
  limit 1;

  if v_member_id is null then
    raise exception 'member not found or inactive';
  end if;

  if exists (
    select 1
    from public.attendance_logs al
    where al.member_id = p_member_id and al.date = v_today
  ) then
    raise exception 'member already checked in';
  end if;

  select sa.shift_id
  into v_assigned_shift_id
  from public.shift_assignments sa
  where sa.member_id = p_member_id
    and sa.work_date = v_today
    and sa.organization_id = v_member_organization_id
  limit 1;

  if v_assigned_shift_id is not null then
    select s.id, s.start_time, s.tolerance_minutes, s.very_late_after_minutes
    into v_shift_id, v_shift_start_time, v_shift_tolerance_minutes, v_shift_very_late_after_minutes
    from public.shifts s
    where s.id = v_assigned_shift_id
    limit 1;
  end if;

  if v_shift_id is null then
    v_status := 'no_shift';
    v_late_minutes := 0;
  else
    v_late_minutes := greatest(
      0,
      floor(extract(epoch from (now() - (v_today::text || 'T' || v_shift_start_time::text)::timestamp)) / 60)::int
    );

    if v_late_minutes <= v_shift_tolerance_minutes then
      v_status := 'on_time';
    elsif v_late_minutes >= v_shift_very_late_after_minutes then
      v_status := 'very_late';
    else
      v_status := 'late';
    end if;
  end if;

  insert into public.attendance_logs (
    member_id,
    confidence,
    date,
    organization_id,
    shift_id,
    status,
    late_minutes
  )
  values (
    p_member_id,
    p_confidence,
    v_today,
    v_member_organization_id,
    v_shift_id,
    v_status,
    v_late_minutes
  );

  return query select v_status, v_late_minutes, v_shift_id;
end;
$$;

grant execute on function public.kiosk_active_members() to anon, authenticated;
grant execute on function public.kiosk_today_checked_in() to anon, authenticated;
grant execute on function public.secure_match_member_by_face(vector, float) to anon, authenticated;
grant execute on function public.secure_attendance_check_in(uuid, float, boolean) to anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'members'
      and policyname = 'Public read members'
  ) then
    drop policy "Public read members" on public.members;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'attendance_logs'
      and policyname = 'Public insert attendance'
  ) then
    drop policy "Public insert attendance" on public.attendance_logs;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'attendance_logs'
      and policyname = 'Public read attendance'
  ) then
    drop policy "Public read attendance" on public.attendance_logs;
  end if;
end
$$;

-- Phase 6A: pgvector database foundation.
-- Additive and idempotent. Does not remove legacy members.face_descriptor.
create extension if not exists vector;

create table if not exists public.member_face_descriptors (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete set null default public.default_organization_id(),
  member_id uuid not null references public.members(id) on delete cascade,
  descriptor vector(128) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists member_face_descriptors_member_id_idx
  on public.member_face_descriptors (member_id);

create index if not exists member_face_descriptors_organization_id_idx
  on public.member_face_descriptors (organization_id);

create index if not exists member_face_descriptors_descriptor_ivfflat_idx
  on public.member_face_descriptors
  using ivfflat (descriptor vector_l2_ops)
  with (lists = 100);

create or replace function public.match_member_by_face(
  query_embedding vector(128),
  match_threshold float
)
returns table (
  member_id uuid,
  distance float
)
language sql
stable
set search_path = public
as $$
  select mfd.member_id, (mfd.descriptor <-> query_embedding)::float as distance
  from public.member_face_descriptors mfd
  join public.members m on m.id = mfd.member_id
  where m.is_active = true
    and (mfd.descriptor <-> query_embedding) <= match_threshold
  order by mfd.descriptor <-> query_embedding asc
  limit 1
$$;

-- Phase 4: Attendance classification columns.
-- Additive and idempotent. Keeps existing attendance inserts backward compatible.
alter table public.attendance_logs
  add column if not exists shift_id uuid references public.shifts(id) on delete set null;

alter table public.attendance_logs
  add column if not exists status text;

alter table public.attendance_logs
  add column if not exists late_minutes integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendance_logs_status_check'
      and conrelid = 'public.attendance_logs'::regclass
  ) then
    alter table public.attendance_logs
      add constraint attendance_logs_status_check
      check (status in ('on_time', 'late', 'very_late', 'no_shift', 'unknown') or status is null);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organizations'
      and policyname = 'Authenticated users read linked organizations'
  ) then
    create policy "Authenticated users read linked organizations"
      on public.organizations for select
      using (
        exists (
          select 1
          from public.admin_users
          where admin_users.organization_id = organizations.id
            and admin_users.user_id = auth.uid()
        )
      );
  end if;
end
$$;

create or replace function public.handle_new_admin_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_users (user_id, organization_id, role)
  values (new.id, public.default_organization_id(), 'owner')
  on conflict (user_id, organization_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_admin_user on auth.users;

create trigger on_auth_user_created_create_admin_user
  after insert on auth.users
  for each row execute function public.handle_new_admin_user();

-- Phase 3: Shift Management and Schedule Foundation.
-- This section is additive and does not change the existing kiosk attendance flow.
create table if not exists public.shifts (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade default public.default_organization_id(),
  name text not null,
  start_time time not null,
  end_time time not null,
  tolerance_minutes integer not null default 15 check (tolerance_minutes >= 0),
  very_late_after_minutes integer not null default 30 check (very_late_after_minutes >= 0),
  color text not null default '#0e7490',
  is_active boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (organization_id, name),
  check (very_late_after_minutes >= tolerance_minutes)
);

create table if not exists public.shift_assignments (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade default public.default_organization_id(),
  member_id uuid not null references public.members(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete restrict,
  work_date date not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (organization_id, member_id, work_date)
);

create index if not exists shifts_organization_active_idx
  on public.shifts (organization_id, is_active);

create index if not exists shift_assignments_organization_date_idx
  on public.shift_assignments (organization_id, work_date);

create index if not exists shift_assignments_member_date_idx
  on public.shift_assignments (member_id, work_date);

create index if not exists shift_assignments_shift_id_idx
  on public.shift_assignments (shift_id);

alter table public.shifts enable row level security;
alter table public.shift_assignments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'shifts'
      and policyname = 'Admins read organization shifts'
  ) then
    create policy "Admins read organization shifts"
      on public.shifts for select
      using (
        exists (
          select 1
          from public.admin_users
          where admin_users.organization_id = shifts.organization_id
            and admin_users.user_id = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'shifts'
      and policyname = 'Admins manage organization shifts'
  ) then
    create policy "Admins manage organization shifts"
      on public.shifts for all
      using (
        exists (
          select 1
          from public.admin_users
          where admin_users.organization_id = shifts.organization_id
            and admin_users.user_id = auth.uid()
            and admin_users.role in ('owner', 'admin')
        )
      )
      with check (
        exists (
          select 1
          from public.admin_users
          where admin_users.organization_id = shifts.organization_id
            and admin_users.user_id = auth.uid()
            and admin_users.role in ('owner', 'admin')
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'shift_assignments'
      and policyname = 'Admins read organization shift assignments'
  ) then
    create policy "Admins read organization shift assignments"
      on public.shift_assignments for select
      using (
        exists (
          select 1
          from public.admin_users
          where admin_users.organization_id = shift_assignments.organization_id
            and admin_users.user_id = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'shift_assignments'
      and policyname = 'Admins manage organization shift assignments'
  ) then
    create policy "Admins manage organization shift assignments"
      on public.shift_assignments for all
      using (
        exists (
          select 1
          from public.admin_users
          where admin_users.organization_id = shift_assignments.organization_id
            and admin_users.user_id = auth.uid()
            and admin_users.role in ('owner', 'admin')
        )
      )
      with check (
        exists (
          select 1
          from public.admin_users
          where admin_users.organization_id = shift_assignments.organization_id
            and admin_users.user_id = auth.uid()
            and admin_users.role in ('owner', 'admin')
        )
      );
  end if;
end
$$;
