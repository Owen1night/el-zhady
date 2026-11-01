begin;

-- New installation only. Name collisions fail instead of altering unrelated data.
create schema el_zhady_private;
revoke all on schema el_zhady_private from public, anon, authenticated;
grant usage on schema el_zhady_private to authenticated;

create table el_zhady_private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-F0-9]{8}$'),
  title text not null check (char_length(title) between 2 and 80),
  status text not null default 'waiting' check (status in ('waiting', 'closed')),
  locked boolean not null default false,
  capacity integer not null default 50 check (capacity between 2 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  display_suffix integer not null check (display_suffix > 0),
  status text not null default 'active' check (status in ('active', 'removed')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(room_id, display_suffix),
  unique(room_id, id)
);
-- Identity and ownership NEVER appear in public lobby projections or Realtime.
create table el_zhady_private.memberships (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  participant_id uuid not null unique,
  identity_kind text not null check (identity_kind in ('guest', 'registered')),
  removed boolean not null default false,
  primary key(room_id, user_id),
  foreign key(room_id, participant_id) references public.room_participants(room_id, id)
);
create index memberships_user_idx on el_zhady_private.memberships(user_id);
create table el_zhady_private.room_requests (
  admin_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(admin_id, request_id)
);
create table el_zhady_private.join_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  attempts integer not null
);
create table public.practice_results (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id text not null check (activity_id in ('quiz','matching','ordering','map','classification')),
  score integer not null check (score between 0 and 20),
  max_score integer not null default 20 check (max_score = 20),
  content_version text not null,
  completed_at timestamptz not null default now(),
  primary key(user_id, activity_id)
);
-- Permanent name snapshot, even if a guest later clears their browser data.
create table public.competition_results (
  participant_id uuid primary key,
  room_id uuid not null,
  display_name_snapshot text not null check (char_length(display_name_snapshot) between 2 and 40),
  display_suffix integer not null check (display_suffix > 0),
  score integer not null check (score between 0 and 100),
  max_score integer not null default 100 check (max_score = 100),
  recorded_at timestamptz not null default now(),
  foreign key(room_id, participant_id) references public.room_participants(room_id, id)
);
-- Reserved for a future trusted scorer. No answer keys exist in public tables.
create table el_zhady_private.answer_keys (
  activity_id text primary key,
  content_version text not null,
  answer_key jsonb not null
);

create function el_zhady_private.is_permanent() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users u where u.id = auth.uid() and u.is_anonymous is false);
$$;
create function el_zhady_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select el_zhady_private.is_permanent() and exists(
    select 1 from el_zhady_private.admins a where a.user_id = auth.uid());
$$;
create function el_zhady_private.can_view_room(p_room_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select el_zhady_private.is_admin() or exists(
    select 1 from el_zhady_private.memberships m
    where m.room_id = p_room_id and m.user_id = auth.uid() and not m.removed);
$$;
create function el_zhady_private.owns_registered_participant(p_participant_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select el_zhady_private.is_permanent() and exists(
    select 1 from el_zhady_private.memberships m
    where m.participant_id = p_participant_id and m.user_id = auth.uid() and m.identity_kind = 'registered');
$$;
create function el_zhady_private.clean_name(p_name text) returns text
language plpgsql immutable set search_path = '' as $$
declare v_name text;
begin
  if p_name is null or char_length(p_name) > 160 or p_name ~ '[[:cntrl:]<>]' then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;
  v_name := regexp_replace(btrim(p_name), '\s+', ' ', 'g');
  if char_length(v_name) not between 2 and 40 then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;
  return v_name;
end;
$$;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.practice_results enable row level security;
alter table public.competition_results enable row level security;
alter table el_zhady_private.admins enable row level security;
alter table el_zhady_private.memberships enable row level security;
alter table el_zhady_private.room_requests enable row level security;
alter table el_zhady_private.join_limits enable row level security;
alter table el_zhady_private.answer_keys enable row level security;

revoke all on public.profiles, public.rooms, public.room_participants, public.practice_results, public.competition_results from public, anon, authenticated;
revoke all on all tables in schema el_zhady_private from public, anon, authenticated;
grant select on public.profiles, public.rooms, public.room_participants, public.practice_results, public.competition_results to authenticated;
create policy profile_owner on public.profiles for select to authenticated
  using (user_id = auth.uid() and el_zhady_private.is_permanent());
create policy room_member on public.rooms for select to authenticated
  using (el_zhady_private.can_view_room(id));
create policy participant_member on public.room_participants for select to authenticated
  using (el_zhady_private.can_view_room(room_id));
create policy practice_owner on public.practice_results for select to authenticated
  using (user_id = auth.uid() and el_zhady_private.is_permanent());
create policy competition_visibility on public.competition_results for select to authenticated
  using (el_zhady_private.can_view_room(room_id) or el_zhady_private.owns_registered_participant(participant_id));

create function public.my_access() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('registered', el_zhady_private.is_permanent(), 'admin', el_zhady_private.is_admin());
$$;
create function public.save_profile(p_display_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles;
begin
  if not el_zhady_private.is_permanent() then raise exception 'REGISTERED_REQUIRED' using errcode = '42501'; end if;
  insert into public.profiles(user_id, display_name) values (auth.uid(), el_zhady_private.clean_name(p_display_name))
    on conflict(user_id) do update set display_name = excluded.display_name, updated_at = now()
    returning * into v_profile;
  return to_jsonb(v_profile);
end;
$$;

create function public.join_room(p_code text, p_display_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_room public.rooms; v_member el_zhady_private.memberships;
  v_participant uuid; v_name text; v_count integer; v_attempts integer; v_window timestamptz;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  -- Serialize per-identity attempts. Return errors (do not raise) after counting,
  -- so failed joins commit their rate-limit state instead of rolling it back.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  insert into el_zhady_private.join_limits(user_id, window_start, attempts) values(v_uid, now(), 0)
    on conflict(user_id) do nothing;
  select window_start, attempts into v_window, v_attempts from el_zhady_private.join_limits where user_id = v_uid;
  if v_window < now() - interval '1 minute' then v_window := now(); v_attempts := 0; end if;
  v_attempts := v_attempts + 1;
  update el_zhady_private.join_limits set window_start = v_window, attempts = v_attempts where user_id = v_uid;
  if v_attempts > 10 then return jsonb_build_object('error', 'RATE_LIMITED'); end if;
  if p_code is null or char_length(p_code) > 16 or upper(btrim(p_code)) !~ '^[A-F0-9]{8}$' then
    return jsonb_build_object('error', 'INVALID_ROOM_CODE');
  end if;
  begin v_name := el_zhady_private.clean_name(p_display_name);
    exception when sqlstate '22023' then return jsonb_build_object('error', 'INVALID_NAME'); end;
  select * into v_room from public.rooms where code = upper(btrim(p_code)) for update;
  if not found then return jsonb_build_object('error', 'ROOM_NOT_FOUND'); end if;
  if v_room.status = 'closed' then return jsonb_build_object('error', 'ROOM_CLOSED'); end if;
  select * into v_member from el_zhady_private.memberships where room_id = v_room.id and user_id = v_uid;
  if found then
    if v_member.removed then return jsonb_build_object('error', 'REMOVED'); end if;
    -- An existing member may reconnect while joining is locked or the room is full.
    return jsonb_build_object('room_id', v_room.id, 'participant_id', v_member.participant_id);
  end if;
  if v_room.locked then return jsonb_build_object('error', 'ROOM_LOCKED'); end if;
  select count(*) into v_count from public.room_participants where room_id = v_room.id and status = 'active';
  if v_count >= v_room.capacity then return jsonb_build_object('error', 'ROOM_FULL'); end if;
  select coalesce(max(display_suffix), 0) + 1 into v_count from public.room_participants where room_id = v_room.id;
  insert into public.room_participants(room_id, display_name, display_suffix)
    values(v_room.id, v_name, v_count) returning id into v_participant;
  insert into el_zhady_private.memberships(room_id, user_id, participant_id, identity_kind)
    values(v_room.id, v_uid, v_participant, case when el_zhady_private.is_permanent() then 'registered' else 'guest' end);
  return jsonb_build_object('room_id', v_room.id, 'participant_id', v_participant);
end;
$$;

create function public.get_lobby(p_room_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_room public.rooms; v_participant uuid;
begin
  if not el_zhady_private.can_view_room(p_room_id) then raise exception 'ROOM_ACCESS_DENIED' using errcode = '42501'; end if;
  select * into v_room from public.rooms where id = p_room_id;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  select participant_id into v_participant from el_zhady_private.memberships where room_id = p_room_id and user_id = auth.uid() and not removed;
  return jsonb_build_object(
    'room', to_jsonb(v_room), 'my_participant_id', v_participant, 'can_manage', el_zhady_private.is_admin(),
    'participants', coalesce((select jsonb_agg(to_jsonb(p) order by p.display_suffix) from public.room_participants p where p.room_id = p_room_id and p.status = 'active'), '[]'::jsonb),
    'results', coalesce((select jsonb_agg(to_jsonb(r) order by r.score desc, r.display_suffix) from public.competition_results r where r.room_id = p_room_id), '[]'::jsonb));
end;
$$;
create function public.lobby_heartbeat(p_room_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.room_participants p set last_seen_at = now()
  from el_zhady_private.memberships m
  where m.room_id = p_room_id and m.user_id = auth.uid() and not m.removed and p.id = m.participant_id
    and p.last_seen_at < now() - interval '15 seconds';
end;
$$;

create function public.admin_create_room(p_request_id uuid, p_title text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.rooms; v_id uuid; v_title text; v_code text; v_count integer;
begin
  if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if p_request_id is null then raise exception 'INVALID_REQUEST'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 1));
  select room_id into v_id from el_zhady_private.room_requests where admin_id = auth.uid() and request_id = p_request_id;
  if found then select * into v_room from public.rooms where id = v_id; return to_jsonb(v_room); end if;
  v_title := regexp_replace(btrim(p_title), '\s+', ' ', 'g');
  if v_title is null or char_length(v_title) not between 2 and 80 or v_title ~ '[[:cntrl:]<>]' then raise exception 'INVALID_TITLE'; end if;
  select count(*) into v_count from el_zhady_private.room_requests where admin_id = auth.uid() and created_at > now() - interval '1 hour';
  if v_count >= 5 then raise exception 'ROOM_CREATE_LIMIT'; end if;
  -- UUID randomness, not an incrementing/predictable room identifier.
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.rooms(code, title) values(v_code, v_title) returning * into v_room;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  insert into el_zhady_private.room_requests(admin_id, request_id, room_id) values(auth.uid(), p_request_id, v_room.id);
  return to_jsonb(v_room);
end;
$$;
create function public.admin_room_action(p_room_id uuid, p_action text, p_participant_id uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_room public.rooms;
begin
  if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if p_action = 'close' then
    update public.rooms set status = 'closed', locked = true, updated_at = now() where id = p_room_id;
  elsif p_action in ('lock','unlock') then
    if v_room.status = 'closed' then raise exception 'ROOM_CLOSED'; end if;
    update public.rooms set locked = (p_action = 'lock'), updated_at = now() where id = p_room_id;
  elsif p_action = 'remove' then
    if not exists(select 1 from public.room_participants where id = p_participant_id and room_id = p_room_id) then raise exception 'PARTICIPANT_NOT_FOUND'; end if;
    update el_zhady_private.memberships set removed = true where room_id = p_room_id and participant_id = p_participant_id;
    update public.room_participants set status = 'removed' where room_id = p_room_id and id = p_participant_id;
  else raise exception 'INVALID_ACTION';
  end if;
end;
$$;
create function public.my_competition_history() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not el_zhady_private.is_permanent() then raise exception 'REGISTERED_REQUIRED' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'participant_id', r.participant_id, 'room_title', room.title, 'room_code', room.code,
    'display_name', r.display_name_snapshot, 'display_suffix', r.display_suffix,
    'score', r.score, 'max_score', r.max_score, 'recorded_at', r.recorded_at) order by r.recorded_at desc)
    from public.competition_results r
    join el_zhady_private.memberships m on m.participant_id = r.participant_id
    join public.rooms room on room.id = r.room_id
    where m.user_id = auth.uid() and m.identity_kind = 'registered'), '[]'::jsonb);
end;
$$;

-- Explicit ACLs: no default PUBLIC execution, and no browser table mutations.
revoke all on all functions in schema el_zhady_private from public, anon, authenticated;
grant execute on function el_zhady_private.is_permanent(), el_zhady_private.is_admin(),
  el_zhady_private.can_view_room(uuid), el_zhady_private.owns_registered_participant(uuid) to authenticated;
revoke all on function public.my_access(), public.save_profile(text), public.join_room(text,text),
  public.get_lobby(uuid), public.lobby_heartbeat(uuid), public.admin_create_room(uuid,text),
  public.admin_room_action(uuid,text,uuid), public.my_competition_history() from public, anon, authenticated;
grant execute on function public.my_access(), public.save_profile(text), public.join_room(text,text),
  public.get_lobby(uuid), public.lobby_heartbeat(uuid), public.admin_create_room(uuid,text),
  public.admin_room_action(uuid,text,uuid), public.my_competition_history() to authenticated;
-- Only a future protected scorer/server may persist scores. No scoring RPC yet.
grant all on public.practice_results, public.competition_results to service_role;

-- Only safe lobby tables enter Realtime; no identities, profiles or answer keys.
do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.rooms, public.room_participants, public.competition_results;
  end if;
end $$;
commit;
