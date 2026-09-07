create extension if not exists pgcrypto;

alter table public.organizations add column if not exists owner_name text;
alter table public.organizations add column if not exists slug text;
update public.organizations set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left(id::text, 6) where slug is null;
alter table public.organizations alter column slug set not null;
create unique index if not exists organizations_slug_key on public.organizations(slug);

alter table public.members alter column face_descriptor drop not null;
alter table public.members add column if not exists badge_code text;
alter table public.members add column if not exists attendance_pin_hash text;
create unique index if not exists members_org_badge_key on public.members(organization_id, badge_code) where badge_code is not null;

alter table public.attendance_logs add column if not exists check_out_at timestamptz;
alter table public.attendance_logs add column if not exists break_started_at timestamptz;
alter table public.attendance_logs add column if not exists break_minutes integer not null default 0;
alter table public.attendance_logs add column if not exists verification_method text not null default 'face';
alter table public.attendance_logs add column if not exists corrected_at timestamptz;
alter table public.attendance_logs add column if not exists corrected_by uuid references auth.users(id) on delete set null;
alter table public.attendance_logs add column if not exists correction_reason text;

create table if not exists public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'viewer')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  attendance_log_id uuid not null references public.attendance_logs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  previous_values jsonb not null,
  new_values jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  weekdays smallint[] not null default '{1,2,3,4,5}',
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create or replace function public.is_org_admin(target_organization uuid, allowed_roles text[] default array['owner','admin','viewer'])
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid() and organization_id = target_organization and role = any(allowed_roles));
$$;

alter table public.admin_invitations enable row level security;
alter table public.attendance_corrections enable row level security;
alter table public.schedule_templates enable row level security;

create policy "Owners manage invitations" on public.admin_invitations for all to authenticated
  using (public.is_org_admin(organization_id, array['owner']))
  with check (public.is_org_admin(organization_id, array['owner']) and invited_by = auth.uid());
create policy "Admins read corrections" on public.attendance_corrections for select to authenticated
  using (public.is_org_admin(organization_id));
create policy "Admins create corrections" on public.attendance_corrections for insert to authenticated
  with check (public.is_org_admin(organization_id, array['owner','admin']) and requested_by = auth.uid());
create policy "Admins manage schedule templates" on public.schedule_templates for all to authenticated
  using (public.is_org_admin(organization_id, array['owner','admin']))
  with check (public.is_org_admin(organization_id, array['owner','admin']));

drop policy if exists "Authenticated manage members" on public.members;
drop policy if exists "Authenticated manage attendance" on public.attendance_logs;
create policy "Admins read organization members" on public.members for select to authenticated using (public.is_org_admin(organization_id));
create policy "Admins manage organization members" on public.members for all to authenticated using (public.is_org_admin(organization_id, array['owner','admin'])) with check (public.is_org_admin(organization_id, array['owner','admin']));
create policy "Admins read organization attendance" on public.attendance_logs for select to authenticated using (public.is_org_admin(organization_id));
create policy "Admins manage organization attendance" on public.attendance_logs for all to authenticated using (public.is_org_admin(organization_id, array['owner','admin'])) with check (public.is_org_admin(organization_id, array['owner','admin']));

create or replace function public.handle_new_admin_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  organization_name text := nullif(trim(new.raw_user_meta_data->>'organization_name'), '');
  owner_name text := nullif(trim(new.raw_user_meta_data->>'owner_name'), '');
  organization_id uuid;
begin
  if organization_name is null then
    return new;
  end if;
  insert into public.organizations(name, owner_name, slug)
  values (organization_name, owner_name, lower(regexp_replace(organization_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left(new.id::text, 6))
  returning id into organization_id;
  insert into public.admin_users(user_id, organization_id, role) values (new.id, organization_id, 'owner');
  return new;
end;
$$;

create or replace function public.accept_admin_invitation(raw_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare invitation public.admin_invitations%rowtype;
begin
  select * into invitation from public.admin_invitations
  where token_hash = encode(digest(raw_token, 'sha256'), 'hex') and accepted_at is null and expires_at > now() for update;
  if invitation.id is null then raise exception 'Invitation is invalid or expired'; end if;
  if lower(invitation.email) <> lower(coalesce(auth.jwt()->>'email','')) then raise exception 'Invitation email does not match signed-in user'; end if;
  insert into public.admin_users(user_id, organization_id, role) values (auth.uid(), invitation.organization_id, invitation.role)
  on conflict (user_id, organization_id) do update set role = excluded.role, updated_at = now();
  update public.admin_invitations set accepted_at = now() where id = invitation.id;
  return invitation.organization_id;
end;
$$;
grant execute on function public.accept_admin_invitation(text) to authenticated;

create or replace function public.correct_attendance(log_id uuid, reason_text text, new_check_in timestamptz, new_check_out timestamptz, new_status text)
returns void language plpgsql security definer set search_path = public as $$
declare current_log public.attendance_logs%rowtype;
begin
  if length(trim(reason_text)) < 5 then raise exception 'Correction reason is required'; end if;
  select * into current_log from public.attendance_logs where id = log_id for update;
  if current_log.id is null or not public.is_org_admin(current_log.organization_id, array['owner','admin']) then raise exception 'Not allowed'; end if;
  insert into public.attendance_corrections(attendance_log_id, organization_id, requested_by, reason, previous_values, new_values)
  values (log_id, current_log.organization_id, auth.uid(), reason_text, to_jsonb(current_log), jsonb_build_object('check_in_at',new_check_in,'check_out_at',new_check_out,'status',new_status));
  update public.attendance_logs set check_in_at = coalesce(new_check_in, check_in_at), check_out_at = new_check_out, status = coalesce(new_status,status), corrected_at = now(), corrected_by = auth.uid(), correction_reason = reason_text where id = log_id;
end;
$$;
grant execute on function public.correct_attendance(uuid,text,timestamptz,timestamptz,text) to authenticated;

create or replace function public.kiosk_active_members_scoped(organization_slug text)
returns table(id uuid, organization_id uuid, name text, employee_id text, photo_url text)
language sql security definer set search_path = public as $$
  select m.id, m.organization_id, m.name, m.employee_id, m.photo_url
  from public.members m join public.organizations o on o.id = m.organization_id
  where o.slug = organization_slug and m.is_active = true order by m.name;
$$;

create or replace function public.kiosk_today_attendance_scoped(organization_slug text)
returns table(member_id uuid, check_out_at timestamptz)
language sql security definer set search_path = public as $$
  select al.member_id, al.check_out_at from public.attendance_logs al
  join public.organizations o on o.id = al.organization_id
  where o.slug = organization_slug and al.date = current_date;
$$;

create or replace function public.secure_match_member_by_face_scoped(query_embedding vector(128), match_threshold float, organization_slug text)
returns table(member_id uuid, organization_id uuid, member_name text, employee_id text, photo_url text, distance float)
language sql security definer set search_path = public as $$
  select m.id, m.organization_id, m.name, m.employee_id, m.photo_url, (mfd.descriptor <-> query_embedding)::float
  from public.member_face_descriptors mfd
  join public.members m on m.id = mfd.member_id
  join public.organizations o on o.id = m.organization_id
  where o.slug = organization_slug and m.is_active = true and (mfd.descriptor <-> query_embedding) <= match_threshold
  order by mfd.descriptor <-> query_embedding limit 1;
$$;

create or replace function public.set_member_attendance_credentials(member_id uuid, badge text, pin text)
returns void language plpgsql security definer set search_path = public as $$
declare org_id uuid;
begin
  select organization_id into org_id from public.members where id = member_id;
  if org_id is null or not public.is_org_admin(org_id, array['owner','admin']) then raise exception 'Not allowed'; end if;
  if length(trim(badge)) < 3 or length(pin) < 4 then raise exception 'Badge and PIN are too short'; end if;
  update public.members set badge_code = trim(badge), attendance_pin_hash = crypt(pin, gen_salt('bf')), updated_at = now() where id = member_id;
end;
$$;
grant execute on function public.set_member_attendance_credentials(uuid,text,text) to authenticated;

create or replace function public.secure_fallback_attendance(organization_slug text, badge text, pin text, requested_action text)
returns table(action text, member_name text, status text)
language plpgsql security definer set search_path = public as $$
declare member_row public.members%rowtype; log_row public.attendance_logs%rowtype;
begin
  select m.* into member_row from public.members m join public.organizations o on o.id = m.organization_id
  where o.slug = organization_slug and m.badge_code = trim(badge) and m.attendance_pin_hash = crypt(pin, m.attendance_pin_hash) and m.is_active = true;
  if member_row.id is null then raise exception 'Invalid badge or PIN'; end if;
  select * into log_row from public.attendance_logs where member_id = member_row.id and date = current_date for update;
  if requested_action = 'check_in' then
    if log_row.id is not null then raise exception 'Already checked in'; end if;
    insert into public.attendance_logs(member_id, organization_id, confidence, date, status, verification_method)
    values(member_row.id, member_row.organization_id, 1, current_date, 'no_shift', 'badge_pin');
  elsif requested_action = 'check_out' then
    if log_row.id is null or log_row.check_out_at is not null then raise exception 'No open attendance session'; end if;
    update public.attendance_logs set check_out_at = now() where id = log_row.id;
  elsif requested_action = 'break_start' then
    if log_row.id is null or log_row.check_out_at is not null or log_row.break_started_at is not null then raise exception 'Break cannot start'; end if;
    update public.attendance_logs set break_started_at = now() where id = log_row.id;
  elsif requested_action = 'break_end' then
    if log_row.id is null or log_row.break_started_at is null then raise exception 'No active break'; end if;
    update public.attendance_logs set break_minutes = break_minutes + greatest(1, floor(extract(epoch from (now() - break_started_at)) / 60)::int), break_started_at = null where id = log_row.id;
  else raise exception 'Invalid attendance action';
  end if;
  return query select requested_action, member_row.name, coalesce(log_row.status, 'no_shift');
end;
$$;
grant execute on function public.kiosk_active_members_scoped(text) to anon, authenticated;
grant execute on function public.kiosk_today_attendance_scoped(text) to anon, authenticated;
grant execute on function public.secure_match_member_by_face_scoped(vector,float,text) to anon, authenticated;
grant execute on function public.secure_fallback_attendance(text,text,text,text) to anon, authenticated;

create or replace function public.secure_attendance_check_in_scoped(p_member_id uuid, p_confidence float, p_liveness_verified boolean, organization_slug text)
returns table(status text, late_minutes integer, shift_id uuid)
language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from public.members m join public.organizations o on o.id = m.organization_id where m.id = p_member_id and o.slug = organization_slug) then
    raise exception 'Member not found in organization';
  end if;
  return query select * from public.secure_attendance_check_in(p_member_id, p_confidence, p_liveness_verified);
end;
$$;
grant execute on function public.secure_attendance_check_in_scoped(uuid,float,boolean,text) to anon, authenticated;
