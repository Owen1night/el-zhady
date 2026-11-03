begin;
-- Apply once AFTER Stage 3, with no active quiz running. Never rerun old migrations.
do $$ begin
  if exists(select 1 from public.live_quiz_sessions where status='running') then
    raise exception 'Finish or cancel active Stage 3 quizzes before applying this migration';
  end if;
end $$;
alter table el_zhady_private.memberships add column blocked boolean not null default false;
-- Existing removals meant permanent room bans. Preserve that intent on upgrade.
update el_zhady_private.memberships set blocked=true where removed;
alter table el_zhady_private.live_quiz_questions drop constraint live_quiz_questions_ordinal_check;
alter table el_zhady_private.live_quiz_questions add constraint live_quiz_questions_ordinal_check check(ordinal between 1 and 1000);
alter table public.live_quiz_sessions drop constraint live_quiz_sessions_room_id_key;
create table public.live_competitions (
 id uuid primary key default gen_random_uuid(),room_id uuid not null unique references public.rooms(id) on delete cascade,
 status text not null default 'ready' check(status in('ready','running','between_rounds','awaiting_reveal','revealed','cancelled')),
 current_round integer not null default 1 check(current_round between 1 and 3),
 started_at timestamptz,revealed_at timestamptz,created_at timestamptz not null default now()
);
alter table public.live_quiz_sessions add column competition_id uuid references public.live_competitions(id) on delete cascade;
alter table public.live_quiz_sessions add column round_number integer not null default 1 check(round_number between 1 and 3);
alter table public.live_quiz_sessions add constraint live_round_unique unique(competition_id,round_number);
insert into public.live_competitions(room_id,status,started_at,revealed_at)
 select room_id,case status when 'completed' then 'revealed' when 'cancelled' then 'cancelled' else 'ready' end,
 starts_at,case when status='completed' then coalesce(finalized_at,updated_at) end from public.live_quiz_sessions;
update public.live_quiz_sessions s set competition_id=c.id from public.live_competitions c where c.room_id=s.room_id;
alter table public.live_quiz_sessions alter column competition_id set not null;
create table el_zhady_private.competition_roster (
 competition_id uuid not null references public.live_competitions(id) on delete cascade,
 participant_id uuid not null references public.room_participants(id),
 display_name_snapshot text not null,display_suffix integer not null,identity_kind text not null check(identity_kind in('guest','registered')),
 primary key(competition_id,participant_id)
);
insert into el_zhady_private.competition_roster select s.competition_id,r.participant_id,r.display_name_snapshot,r.display_suffix,r.identity_kind
 from el_zhady_private.live_quiz_roster r join public.live_quiz_sessions s on s.id=r.session_id;
create table el_zhady_private.competition_final_results (
 competition_id uuid not null references public.live_competitions(id) on delete cascade,
 participant_id uuid not null references public.room_participants(id),display_name_snapshot text not null,display_suffix integer not null,
 correct_count integer not null,speed_points integer not null,raw_points integer not null,eligible boolean not null,rank integer,
 recorded_at timestamptz not null,primary key(competition_id,participant_id)
);
-- Durable history intentionally has NO FK to rooms/participants/sessions. It
-- survives room deletion. Guest records never gain permanent ownership by name.
create table el_zhady_private.saved_competition_history (
 source_kind text not null check(source_kind in('legacy','round','competition')),source_id uuid not null,participant_id uuid not null,
 registered_user_id uuid references auth.users(id) on delete set null,identity_kind text not null check(identity_kind in('guest','registered')),
 competition_id uuid,room_title text not null,room_code text not null,display_name text not null,display_suffix integer not null,
 score integer not null,max_score integer not null,correct_count integer,speed_points integer,rank integer,eligible boolean not null default true,
 recorded_at timestamptz not null,visible boolean not null default false,room_closed boolean not null default false,
 primary key(source_kind,source_id,participant_id)
);
create index saved_history_user on el_zhady_private.saved_competition_history(registered_user_id);
-- Minimal tombstones reserve invalidated QR codes and make delete retries safe.
create table el_zhady_private.retired_room_codes(code text primary key,room_id uuid not null unique,deleted_at timestamptz not null default now());
alter table el_zhady_private.room_requests drop constraint room_requests_room_id_fkey;
alter table el_zhady_private.room_requests alter column room_id drop not null;
alter table el_zhady_private.room_requests add constraint room_requests_room_id_fkey foreign key(room_id) references public.rooms(id) on delete set null;
alter table public.live_competitions enable row level security;
alter table el_zhady_private.competition_roster enable row level security;
alter table el_zhady_private.competition_final_results enable row level security;
alter table el_zhady_private.saved_competition_history enable row level security;
alter table el_zhady_private.retired_room_codes enable row level security;
revoke all on public.live_competitions,el_zhady_private.competition_roster,el_zhady_private.competition_final_results,
 el_zhady_private.saved_competition_history,el_zhady_private.retired_room_codes from public,anon,authenticated;
grant select on public.live_competitions to authenticated;
create or replace function el_zhady_private.can_view_room(p_room_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select el_zhady_private.is_admin() or exists(select 1 from el_zhady_private.memberships m join public.rooms r on r.id=m.room_id
 where m.room_id=p_room_id and m.user_id=auth.uid() and not m.removed and not m.blocked and r.status<>'closed');
$$;
create policy competition_member on public.live_competitions for select to authenticated using(el_zhady_private.can_view_room(room_id));
-- Raw result tables are ADMIN ONLY, including former legacy endpoints. Players
-- receive only safe podium/own-result projections through the reveal-gated RPC.
drop policy live_result_member on public.live_quiz_results;
create policy live_results_admin on public.live_quiz_results for select to authenticated using(el_zhady_private.is_admin());
drop policy competition_visibility on public.competition_results;
create policy legacy_results_admin on public.competition_results for select to authenticated using(el_zhady_private.is_admin());
-- Restrictive guards also prevent an unrelated permissive SELECT policy from
-- accidentally reopening raw standings to participants.
create policy live_results_privacy_guard on public.live_quiz_results as restrictive for select to authenticated using(el_zhady_private.is_admin());
create policy legacy_results_privacy_guard on public.competition_results as restrictive for select to authenticated using(el_zhady_private.is_admin());
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='live_quiz_results') then alter publication supabase_realtime drop table public.live_quiz_results; end if;
  if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='competition_results') then alter publication supabase_realtime drop table public.competition_results; end if;
  alter publication supabase_realtime add table public.live_competitions;
 end if;
end $$;

create function el_zhady_private.require_open_room(p_room_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r public.rooms; m el_zhady_private.memberships;
begin
 select * into r from public.rooms where id=p_room_id for share;
 if not found then
  if exists(select 1 from el_zhady_private.retired_room_codes where room_id=p_room_id) then raise exception 'ROOM_DELETED'; end if;
  raise exception 'ROOM_NOT_FOUND';
 end if;
 select * into m from el_zhady_private.memberships where room_id=p_room_id and user_id=auth.uid();
 if not el_zhady_private.is_admin() then
  if m.user_id is null then raise exception 'ROOM_ACCESS_DENIED' using errcode='42501'; end if;
  if r.status='closed' then raise exception 'ROOM_CLOSED'; end if;
  if m.blocked then raise exception 'ROOM_BLOCKED' using errcode='42501'; end if;
  if m.removed then raise exception 'ROOM_REMOVED' using errcode='42501'; end if;
 end if;
end $$;

create or replace function public.join_room(p_code text,p_display_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();r public.rooms;m el_zhady_private.memberships;n text;cnt integer;v_attempts integer;w timestamptz;pid uuid;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
 insert into el_zhady_private.join_limits values(v_uid,now(),0) on conflict(user_id) do nothing;
 select window_start,j.attempts into w,v_attempts from el_zhady_private.join_limits j where user_id=v_uid;
 if w<now()-interval '1 minute' then w:=now();v_attempts:=0;end if;
 v_attempts:=v_attempts+1;update el_zhady_private.join_limits j set window_start=w,attempts=v_attempts where user_id=v_uid;
 if v_attempts>10 then return jsonb_build_object('error','RATE_LIMITED');end if;
 if p_code is null or char_length(p_code)>16 or upper(btrim(p_code))!~'^[A-F0-9]{8}$' then return jsonb_build_object('error','INVALID_ROOM_CODE');end if;
 begin n:=el_zhady_private.clean_name(p_display_name);exception when sqlstate '22023' then return jsonb_build_object('error','INVALID_NAME');end;
 select * into r from public.rooms where code=upper(btrim(p_code)) for update;
 if not found then return jsonb_build_object('error','ROOM_NOT_FOUND');end if;
 if r.status='closed' then return jsonb_build_object('error','ROOM_CLOSED');end if;
 select * into m from el_zhady_private.memberships where room_id=r.id and user_id=v_uid;
 if m.user_id is not null and m.blocked then return jsonb_build_object('error','ROOM_BLOCKED');end if;
 if m.user_id is not null and not m.removed then return jsonb_build_object('room_id',r.id,'participant_id',m.participant_id);end if;
 -- Removal is rejoinable only through this explicit join request before start.
 if r.locked or exists(select 1 from public.live_competitions where room_id=r.id and started_at is not null) then return jsonb_build_object('error','ROOM_LOCKED');end if;
 select count(*) into cnt from public.room_participants where room_id=r.id and status='active';
 if cnt>=r.capacity then return jsonb_build_object('error','ROOM_FULL');end if;
 if m.user_id is not null then
  update el_zhady_private.memberships set removed=false where room_id=r.id and user_id=v_uid;
  update public.room_participants set status='active',last_seen_at=now() where id=m.participant_id;
  return jsonb_build_object('room_id',r.id,'participant_id',m.participant_id);
 end if;
 select coalesce(max(display_suffix),0)+1 into cnt from public.room_participants where room_id=r.id;
 insert into public.room_participants(room_id,display_name,display_suffix) values(r.id,n,cnt) returning id into pid;
 insert into el_zhady_private.memberships(room_id,user_id,participant_id,identity_kind)
 values(r.id,v_uid,pid,case when el_zhady_private.is_permanent() then 'registered' else 'guest' end);
 return jsonb_build_object('room_id',r.id,'participant_id',pid);
end $$;

create or replace function public.get_lobby(p_room_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.rooms;pid uuid;v_admin boolean:=el_zhady_private.is_admin();
begin
 perform el_zhady_private.require_open_room(p_room_id);
 select * into r from public.rooms where id=p_room_id;
 select participant_id into pid from el_zhady_private.memberships where room_id=p_room_id and user_id=auth.uid() and not removed and not blocked;
 return jsonb_build_object('room',to_jsonb(r),'my_participant_id',pid,'can_manage',v_admin,
 'participants',coalesce((select jsonb_agg(to_jsonb(p) order by p.display_suffix) from public.room_participants p where room_id=p_room_id and status='active'),'[]'::jsonb),
 'results',case when v_admin then coalesce((select jsonb_agg(to_jsonb(x)) from public.competition_results x where room_id=p_room_id),'[]'::jsonb) else '[]'::jsonb end);
end $$;

create function el_zhady_private.archive_room_results(p_room_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into el_zhady_private.saved_competition_history(source_kind,source_id,participant_id,registered_user_id,identity_kind,
 room_title,room_code,display_name,display_suffix,score,max_score,recorded_at,visible,room_closed)
 select 'legacy',r.participant_id,r.participant_id,case when m.identity_kind='registered' then m.user_id end,m.identity_kind,
 room.title,room.code,r.display_name_snapshot,r.display_suffix,r.score,r.max_score,r.recorded_at,true,room.status='closed'
 from public.competition_results r join public.rooms room on room.id=r.room_id join el_zhady_private.memberships m on m.participant_id=r.participant_id
 where r.room_id=p_room_id on conflict do nothing;
 insert into el_zhady_private.saved_competition_history(source_kind,source_id,participant_id,registered_user_id,identity_kind,competition_id,
 room_title,room_code,display_name,display_suffix,score,max_score,correct_count,speed_points,rank,eligible,recorded_at,visible,room_closed)
 select 'round',s.id,r.participant_id,case when roster.identity_kind='registered' and m.identity_kind='registered' then m.user_id end,roster.identity_kind,c.id,
 room.title,room.code,r.display_name_snapshot,r.display_suffix,r.raw_points,11000,r.correct_count,r.speed_points,r.rank,r.eligible,r.recorded_at,c.status='revealed',room.status='closed'
 from public.live_quiz_results r join public.live_quiz_sessions s on s.id=r.session_id join public.live_competitions c on c.id=s.competition_id
 join el_zhady_private.live_quiz_roster roster on roster.session_id=s.id and roster.participant_id=r.participant_id
 join el_zhady_private.memberships m on m.participant_id=r.participant_id join public.rooms room on room.id=r.room_id
 where r.room_id=p_room_id and s.status='completed' on conflict do nothing;
 insert into el_zhady_private.saved_competition_history(source_kind,source_id,participant_id,registered_user_id,identity_kind,competition_id,
 room_title,room_code,display_name,display_suffix,score,max_score,correct_count,speed_points,rank,eligible,recorded_at,visible,room_closed)
 select 'competition',c.id,r.participant_id,case when roster.identity_kind='registered' and m.identity_kind='registered' then m.user_id end,roster.identity_kind,c.id,
 room.title,room.code,r.display_name_snapshot,r.display_suffix,r.raw_points,
 11000*(select count(*) from public.live_quiz_sessions where competition_id=c.id),r.correct_count,r.speed_points,r.rank,r.eligible,r.recorded_at,c.status='revealed',room.status='closed'
 from el_zhady_private.competition_final_results r join public.live_competitions c on c.id=r.competition_id
 join el_zhady_private.competition_roster roster on roster.competition_id=c.id and roster.participant_id=r.participant_id
 join el_zhady_private.memberships m on m.participant_id=r.participant_id join public.rooms room on room.id=c.room_id
 where room.id=p_room_id on conflict do nothing;
 update el_zhady_private.saved_competition_history h set visible=h.visible or c.status='revealed',room_closed=h.room_closed or room.status='closed'
 from public.live_competitions c join public.rooms room on room.id=c.room_id where h.competition_id=c.id and room.id=p_room_id;
end $$;

create function el_zhady_private.finish_competition(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into el_zhady_private.competition_final_results
 select p_id,x.participant_id,x.display_name_snapshot,x.display_suffix,x.correct_count,x.speed_points,1000*x.correct_count+x.speed_points,x.eligible,
 case when x.eligible then rank() over(partition by x.eligible order by x.correct_count desc,x.speed_points desc)::integer end,el_zhady_private.live_quiz_clock()
 from (
 select roster.participant_id,roster.display_name_snapshot,roster.display_suffix,coalesce(sum(r.correct_count),0)::integer correct_count,
 coalesce(sum(r.speed_points),0)::integer speed_points,(p.status='active' and not m.removed and not m.blocked) eligible
 from el_zhady_private.competition_roster roster join public.room_participants p on p.id=roster.participant_id
 join el_zhady_private.memberships m on m.participant_id=p.id
 left join public.live_quiz_sessions s on s.competition_id=roster.competition_id and s.status='completed'
 left join public.live_quiz_results r on r.session_id=s.id and r.participant_id=p.id
 where roster.competition_id=p_id group by roster.participant_id,roster.display_name_snapshot,roster.display_suffix,p.status,m.removed,m.blocked
 ) x on conflict do nothing;
end $$;

-- Preserve audited Stage 3 score math; wrap completion in the new competition state.
create function el_zhady_private.sync_live_quiz_stage3(p_session_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.live_quiz_sessions; v_now timestamptz; v_elapsed numeric; v_step integer;
begin
  select * into s from public.live_quiz_sessions where id=p_session_id for update;
  if not found or s.status<>'running' then return; end if;
  v_now:=el_zhady_private.live_quiz_clock();
  v_elapsed:=extract(epoch from(v_now-s.starts_at));
  if v_elapsed<0 then v_step:=0;
  elsif v_elapsed>=200 then v_step:=21;
  else v_step:=1+2*floor(v_elapsed/20)::integer+case when mod(v_elapsed,20)>=15 then 1 else 0 end;
  end if;
  v_step:=greatest(v_step,s.phase_step); -- repeat/clock correction cannot reset a phase
  if v_step=21 then
    insert into public.live_quiz_results(session_id,participant_id,room_id,display_name_snapshot,display_suffix,correct_count,speed_points,eligible,rank,recorded_at)
    select p_session_id,a.participant_id,s.room_id,a.display_name_snapshot,a.display_suffix,a.correct_count,a.speed_points,a.eligible,
      case when a.eligible then rank() over(partition by a.eligible order by a.correct_count desc,a.speed_points desc)::integer else null end,
      s.starts_at+interval '200 seconds'
    from (
      select r.participant_id,r.display_name_snapshot,r.display_suffix,
        count(ans.question_id) filter(where ans.is_correct)::integer correct_count,
        coalesce(sum(ans.speed_points),0)::integer speed_points,
        (p.status='active' and not coalesce(m.removed,true)) eligible
      from el_zhady_private.live_quiz_roster r
      join public.room_participants p on p.id=r.participant_id
      left join el_zhady_private.memberships m on m.participant_id=r.participant_id
      left join el_zhady_private.live_quiz_answers ans on ans.session_id=r.session_id and ans.participant_id=r.participant_id
      where r.session_id=p_session_id
      group by r.participant_id,r.display_name_snapshot,r.display_suffix,p.status,m.removed
    ) a
    on conflict(session_id,participant_id) do nothing;
    update public.live_quiz_sessions set status='completed',phase_step=21,finalized_at=v_now,updated_at=v_now where id=p_session_id;
  elsif v_step>s.phase_step then
    update public.live_quiz_sessions set phase_step=v_step,updated_at=v_now where id=p_session_id;
  end if;
end $$;

-- Replace in place to retain the entrypoint OID for existing SQL callers.
create or replace function el_zhady_private.sync_live_quiz(p_session_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.live_quiz_sessions;c public.live_competitions;
begin
 select * into s from public.live_quiz_sessions where id=p_session_id;
 if not found then return;end if;
 select * into c from public.live_competitions where id=s.competition_id for update;
 perform el_zhady_private.sync_live_quiz_stage3(p_session_id);
 select * into s from public.live_quiz_sessions where id=p_session_id;
 if s.status='completed' and c.status='running' and c.current_round=s.round_number then
  if exists(select 1 from public.live_quiz_sessions where competition_id=c.id and round_number>s.round_number) then
   update public.live_competitions set status='between_rounds' where id=c.id;
  else
   perform el_zhady_private.finish_competition(c.id);
   update public.live_competitions set status='awaiting_reveal' where id=c.id;
  end if;
  perform el_zhady_private.archive_room_results(c.room_id);
 end if;
end $$;
create or replace function el_zhady_private.tick_live_quizzes() returns void
language plpgsql security definer set search_path='' as $$
declare c record;s record;
begin
 for c in select id from public.live_competitions where status='running' order by started_at for update skip locked limit 100 loop
  for s in select id from public.live_quiz_sessions where competition_id=c.id and status='running' loop
   perform el_zhady_private.sync_live_quiz(s.id);
  end loop;
 end loop;
end $$;

create or replace function public.available_live_quizzes() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('version',s.version,'title',s.title,'question_count',10,'bank_size',(select count(*) from el_zhady_private.live_quiz_questions where set_version=s.version)) order by s.checked_on desc,s.version)
 from el_zhady_private.live_quiz_sets s where published and (select count(*) from el_zhady_private.live_quiz_questions where set_version=s.version)>=10),'[]'::jsonb);
end $$;
create function public.configure_competition(p_room_id uuid,p_lineup jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.live_competitions;r public.rooms;item jsonb;n integer:=0;
begin
 if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.status='closed' then raise exception 'ROOM_CLOSED';end if;
 select * into c from public.live_competitions where room_id=p_room_id for update;
 if found and (c.status<>'ready' or c.started_at is not null) then raise exception 'QUIZ_ALREADY_STARTED';end if;
 if p_lineup is null or jsonb_typeof(p_lineup)<>'array' or jsonb_array_length(p_lineup) not between 1 and 3 then raise exception 'INVALID_LINEUP';end if;
 for item in select value from jsonb_array_elements(p_lineup) loop
  if item->>'game_kind' is distinct from 'quiz' or not exists(select 1 from el_zhady_private.live_quiz_sets s where version=item->>'set_version' and published)
    or (select count(*) from el_zhady_private.live_quiz_questions where set_version=item->>'set_version')<10 then raise exception 'INVALID_LINEUP';end if;
 end loop;
 insert into public.live_competitions(room_id) values(p_room_id) on conflict(room_id) do nothing;
 select * into c from public.live_competitions where room_id=p_room_id for update;
 for item in select value from jsonb_array_elements(p_lineup) loop
  n:=n+1;
  insert into public.live_quiz_sessions(room_id,competition_id,round_number,set_version) values(p_room_id,c.id,n,item->>'set_version')
  on conflict(competition_id,round_number) do update set set_version=excluded.set_version;
 end loop;
 delete from public.live_quiz_sessions where competition_id=c.id and round_number>n;
 return jsonb_build_object('competition_id',c.id,'round_count',n);
end $$;
create or replace function public.configure_live_quiz(p_room_id uuid,p_version text) returns jsonb
language sql security definer set search_path='' as $$
 select public.configure_competition(p_room_id,jsonb_build_array(jsonb_build_object('game_kind','quiz','set_version',p_version)));
$$;

-- Reusable private draw primitive: sample without replacement and store an order.
-- No public RPC can request a draw or read its result before that question opens.
create function el_zhady_private.draw_quiz_round(p_session_id uuid,p_version text) returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into el_zhady_private.live_quiz_snapshot(session_id,question_id,ordinal,prompt,options,correct_option_id,explanation,source_refs)
 select p_session_id,q.id,row_number() over(order by q.draw_order)::integer,q.prompt,q.options,q.correct_option_id,q.explanation,q.source_refs
 from (select *,gen_random_uuid() draw_order from el_zhady_private.live_quiz_questions where set_version=p_version order by random() limit 10) q;
 if (select count(*) from el_zhady_private.live_quiz_snapshot where session_id=p_session_id)<>10 or exists(
 select 1 from el_zhady_private.live_quiz_snapshot q where session_id=p_session_id and (jsonb_array_length(options)<>4 or
 (select count(distinct x->>'id') from jsonb_array_elements(q.options) x)<>4 or not exists(select 1 from jsonb_array_elements(q.options) x where x->>'id'=q.correct_option_id))) then raise exception 'QUIZ_NOT_CONFIGURED';end if;
end $$;
create function public.start_competition_round(p_room_id uuid,p_round_number integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.live_competitions;s public.live_quiz_sessions;r public.rooms;cnt integer;
begin
 if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.status='closed' then raise exception 'ROOM_CLOSED';end if;
 select * into c from public.live_competitions where room_id=p_room_id for update;
 if not found then raise exception 'QUIZ_NOT_CONFIGURED';end if;
 select * into s from public.live_quiz_sessions where competition_id=c.id and round_number=p_round_number;
 if not found then raise exception 'INVALID_ROUND';end if;
 if s.status in('running','completed') then return jsonb_build_object('session_id',s.id,'starts_at',s.starts_at);end if;
 if c.status='cancelled' then raise exception 'QUIZ_CANCELLED';end if;
 if (c.status='ready' and p_round_number<>1) or (c.status<>'ready' and (c.status<>'between_rounds' or p_round_number<>c.current_round+1)) then raise exception 'INVALID_ROUND';end if;
 if not el_zhady_private.live_quiz_scheduler_ready() then raise exception 'QUIZ_SCHEDULER_REQUIRED';end if;
 if c.started_at is null then
  insert into el_zhady_private.competition_roster
  select c.id,p.id,p.display_name,p.display_suffix,m.identity_kind from public.room_participants p join el_zhady_private.memberships m on m.participant_id=p.id
  where p.room_id=p_room_id and p.status='active' and not m.removed and not m.blocked and m.user_id<>auth.uid();
 end if;
 select count(*) into cnt from el_zhady_private.competition_roster cr join el_zhady_private.memberships m on m.participant_id=cr.participant_id
 where cr.competition_id=c.id and not m.removed and not m.blocked;
 if cnt<1 then raise exception 'NO_PARTICIPANTS';end if;
 perform el_zhady_private.draw_quiz_round(s.id,s.set_version);
 insert into el_zhady_private.live_quiz_roster select s.id,participant_id,display_name_snapshot,display_suffix,identity_kind from el_zhady_private.competition_roster where competition_id=c.id;
 update public.rooms set locked=true,updated_at=el_zhady_private.live_quiz_clock() where id=p_room_id;
 update public.live_competitions set status='running',current_round=p_round_number,started_at=coalesce(started_at,el_zhady_private.live_quiz_clock()) where id=c.id;
 update public.live_quiz_sessions set status='running',starts_at=el_zhady_private.live_quiz_clock()+interval '3 seconds',roster_count=(select count(*) from el_zhady_private.competition_roster where competition_id=c.id),updated_at=el_zhady_private.live_quiz_clock()
 where id=s.id returning * into s;
 return jsonb_build_object('session_id',s.id,'starts_at',s.starts_at);
end $$;
create or replace function public.start_live_quiz(p_room_id uuid) returns jsonb
language sql security definer set search_path='' as $$select public.start_competition_round(p_room_id,1);$$;

create function public.reveal_competition_results(p_room_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.live_competitions;s public.live_quiz_sessions;
begin
 if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 perform 1 from public.rooms where id=p_room_id and status<>'closed' for update;
 if not found then raise exception 'ROOM_CLOSED';end if;
 select * into c from public.live_competitions where room_id=p_room_id for update;
 select * into s from public.live_quiz_sessions where competition_id=c.id and round_number=c.current_round;
 perform el_zhady_private.sync_live_quiz(s.id);
 select * into c from public.live_competitions where id=c.id;
 if c.status='revealed' then return jsonb_build_object('revealed_at',c.revealed_at);end if;
 if c.status<>'awaiting_reveal' then raise exception 'RESULTS_NOT_READY';end if;
 update public.live_competitions set status='revealed',revealed_at=el_zhady_private.live_quiz_clock() where id=c.id returning * into c;
 perform el_zhady_private.archive_room_results(p_room_id);
 return jsonb_build_object('revealed_at',c.revealed_at);
end $$;

create function el_zhady_private.competition_board(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('participant_id',participant_id,'display_name',display_name_snapshot,'display_suffix',display_suffix,
 'correct_count',correct_count,'speed_points',speed_points,'raw_points',raw_points,'eligible',eligible,'rank',rank) order by eligible desc,rank,display_suffix),'[]'::jsonb)
 from el_zhady_private.competition_final_results where competition_id=p_id;
$$;

create function el_zhady_private.quiz_round_state(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p_room_id uuid; s public.live_quiz_sessions; q el_zhady_private.live_quiz_snapshot; a el_zhady_private.live_quiz_answers;
  v_now timestamptz; v_phase text; v_ordinal integer; v_revealed integer; v_pid uuid; v_options jsonb; v_question jsonb; v_answer jsonb; v_board jsonb;
begin

  select * into s from public.live_quiz_sessions where id=p_session_id;
  if not found then return jsonb_build_object('session',null,'server_now',el_zhady_private.live_quiz_clock()); end if;
  p_room_id:=s.room_id;
  perform el_zhady_private.sync_live_quiz(s.id);
  -- A removal may have committed while this read waited for the session lock.
  -- Recheck after serialization before exposing the new phase/question.

  select * into s from public.live_quiz_sessions where id=s.id;
  v_now:=el_zhady_private.live_quiz_clock(); v_revealed:=least(10,s.phase_step/2);
  v_phase:=case when s.status='ready' then 'waiting' when s.status='completed' then 'finished' when s.status='cancelled' then 'cancelled'
    when s.phase_step=0 then 'countdown' when mod(s.phase_step,2)=1 then 'question' else 'reveal' end;
  select m.participant_id into v_pid from el_zhady_private.memberships m
    where m.room_id=p_room_id and m.user_id=auth.uid() and not m.removed
      and exists(select 1 from el_zhady_private.live_quiz_roster r where r.session_id=s.id and r.participant_id=m.participant_id);
  v_ordinal:=case when s.phase_step=0 then 0 else least(10,(s.phase_step+1)/2) end;
  if v_phase in('question','reveal') then
    select * into q from el_zhady_private.live_quiz_snapshot where session_id=s.id and ordinal=v_ordinal;
    select jsonb_agg(x order by md5(coalesce(v_pid::text,'host')||q.question_id::text||(x->>'id'))) into v_options from jsonb_array_elements(q.options) x;
    v_question:=jsonb_build_object('id',q.question_id,'ordinal',q.ordinal,'prompt',q.prompt,'options',v_options,
      'opens_at',s.starts_at+(q.ordinal-1)*interval '20 seconds','deadline',s.starts_at+(q.ordinal-1)*interval '20 seconds'+interval '15 seconds');
    if v_phase='reveal' then v_question:=v_question||jsonb_build_object('correct_option_id',q.correct_option_id,'explanation',q.explanation,'source_refs',q.source_refs); end if;
    select * into a from el_zhady_private.live_quiz_answers where session_id=s.id and participant_id=v_pid and question_id=q.question_id;
    if found then
      v_answer:=jsonb_build_object('option_id',a.option_id,'received_at',a.received_at,'accepted',true);
      if v_phase='reveal' then v_answer:=v_answer||jsonb_build_object('is_correct',a.is_correct,'raw_points',a.raw_points,'speed_points',a.speed_points); end if;
    end if;
  end if;
  if s.status='completed' then
    select coalesce(jsonb_agg(jsonb_build_object('participant_id',r.participant_id,'display_name',r.display_name_snapshot,'display_suffix',r.display_suffix,
      'correct_count',r.correct_count,'speed_points',r.speed_points,'raw_points',r.raw_points,'eligible',r.eligible,'rank',r.rank)
      order by r.eligible desc,r.rank,r.display_suffix),'[]'::jsonb) into v_board from public.live_quiz_results r where r.session_id=s.id;
  else v_board:=el_zhady_private.live_quiz_board(s.id,v_revealed,s.status<>'cancelled'); end if;
  return jsonb_build_object('session',to_jsonb(s),'phase',v_phase,'server_now',v_now,'question_number',v_ordinal,'total_questions',10,
    'phase_ends_at',case when v_phase='countdown' then s.starts_at when v_phase='question' then s.starts_at+(v_ordinal-1)*interval '20 seconds'+interval '15 seconds'
      when v_phase='reveal' then s.starts_at+v_ordinal*interval '20 seconds' else null end,
    'my_participant_id',v_pid,'can_manage',el_zhady_private.is_admin(),'scheduler_ready',case when el_zhady_private.is_admin() then el_zhady_private.live_quiz_scheduler_ready() else null end,
    'question',v_question,'my_answer',v_answer,'leaderboard',v_board,'revealed_count',v_revealed);
end $$;

create or replace function public.live_quiz_state(p_room_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.live_competitions;s public.live_quiz_sessions;v jsonb;board jsonb;podium jsonb;own jsonb;pid uuid;v_admin boolean:=el_zhady_private.is_admin();
begin
 perform el_zhady_private.require_open_room(p_room_id);
 select * into c from public.live_competitions where room_id=p_room_id;
 if not found then return jsonb_build_object('session',null,'competition',null,'server_now',el_zhady_private.live_quiz_clock());end if;
 select * into s from public.live_quiz_sessions where competition_id=c.id and round_number=c.current_round;
 v:=el_zhady_private.quiz_round_state(s.id);
 select * into c from public.live_competitions where id=c.id;
 if not el_zhady_private.can_view_room(p_room_id) then raise exception 'ROOM_ACCESS_DENIED' using errcode='42501';end if;
 board:=el_zhady_private.competition_board(c.id);pid:=(v->>'my_participant_id')::uuid;
 podium:='[]'::jsonb;own:=null;
 if c.status='revealed' then
  select coalesce(jsonb_agg(x),'[]'::jsonb) into podium from jsonb_array_elements(board) x where (x->>'eligible')::boolean and (x->>'rank')::integer<=3;
  select x into own from jsonb_array_elements(board) x where x->>'participant_id'=pid::text;
 end if;
 return v||jsonb_build_object('competition',to_jsonb(c),'round_count',(select count(*) from public.live_quiz_sessions where competition_id=c.id),
 'lineup',(select jsonb_agg(jsonb_build_object('round_number',round_number,'game_kind','quiz','set_version',set_version,'status',status) order by round_number) from public.live_quiz_sessions where competition_id=c.id),
 'leaderboard',case when v_admin then v->'leaderboard' else '[]'::jsonb end,
 'final_standings',case when v_admin then board else '[]'::jsonb end,'podium',podium,'own_result',own);
end $$;

create or replace function public.admin_room_action(p_room_id uuid,p_action text,p_participant_id uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare r public.rooms;c public.live_competitions;s public.live_quiz_sessions;
begin
 if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found then raise exception 'ROOM_NOT_FOUND';end if;
 select * into c from public.live_competitions where room_id=p_room_id for update;
 for s in select * from public.live_quiz_sessions where competition_id=c.id and status='running' loop perform el_zhady_private.sync_live_quiz(s.id);end loop;
 if p_action='close' then
  update public.rooms set status='closed',locked=true,updated_at=now() where id=p_room_id;
  update public.live_quiz_sessions set status='cancelled',cancelled_at=el_zhady_private.live_quiz_clock() where competition_id=c.id and status in('ready','running');
  update public.live_competitions set status='cancelled' where id=c.id and status in('ready','running','between_rounds');
  perform el_zhady_private.archive_room_results(p_room_id);
 elsif p_action in('lock','unlock') then
  if r.status='closed' then raise exception 'ROOM_CLOSED';end if;
  if c.started_at is not null then raise exception 'COMPETITION_STARTED';end if;
  update public.rooms set locked=p_action='lock',updated_at=now() where id=p_room_id;
 elsif p_action in('remove','block') then
  if r.status='closed' then raise exception 'ROOM_CLOSED';end if;
  if not exists(select 1 from public.room_participants where id=p_participant_id and room_id=p_room_id) then raise exception 'PARTICIPANT_NOT_FOUND';end if;
  update el_zhady_private.memberships set removed=true,blocked=blocked or p_action='block' where room_id=p_room_id and participant_id=p_participant_id;
  update public.room_participants set status='removed' where room_id=p_room_id and id=p_participant_id;
 else raise exception 'INVALID_ACTION';end if;
end $$;
create or replace function public.cancel_live_quiz(p_room_id uuid) returns void
language sql security definer set search_path='' as $$select public.admin_room_action(p_room_id,'close');$$;

create function public.admin_delete_room(p_room_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r public.rooms;c record;
begin
 if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found then
  if exists(select 1 from el_zhady_private.retired_room_codes where room_id=p_room_id) then return;end if;
  raise exception 'ROOM_NOT_FOUND';
 end if;
 if r.status<>'closed' then raise exception 'CLOSE_BEFORE_DELETE';end if;
 perform 1 from public.live_competitions where room_id=p_room_id for update;
 perform el_zhady_private.archive_room_results(p_room_id);
 insert into el_zhady_private.retired_room_codes(code,room_id) values(r.code,r.id) on conflict do nothing;
 -- Explicit FK order. Durable history/Auth/practice are deliberately untouched.
 delete from el_zhady_private.live_quiz_answers where session_id in(select id from public.live_quiz_sessions where room_id=p_room_id);
 delete from el_zhady_private.live_quiz_roster where session_id in(select id from public.live_quiz_sessions where room_id=p_room_id);
 delete from el_zhady_private.live_quiz_snapshot where session_id in(select id from public.live_quiz_sessions where room_id=p_room_id);
 delete from public.live_quiz_results where room_id=p_room_id;
 delete from public.competition_results where room_id=p_room_id;
 delete from el_zhady_private.competition_final_results where competition_id in(select id from public.live_competitions where room_id=p_room_id);
 delete from el_zhady_private.competition_roster where competition_id in(select id from public.live_competitions where room_id=p_room_id);
 delete from public.live_quiz_sessions where room_id=p_room_id;
 delete from public.live_competitions where room_id=p_room_id;
 delete from el_zhady_private.memberships where room_id=p_room_id;
 delete from public.rooms where id=p_room_id;
end $$;

create or replace function public.lobby_heartbeat(p_room_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.room_participants p set last_seen_at=now() from el_zhady_private.memberships m,public.rooms r
 where m.room_id=p_room_id and r.id=m.room_id and r.status<>'closed' and m.user_id=auth.uid() and not m.removed and not m.blocked
 and p.id=m.participant_id and p.last_seen_at<now()-interval '15 seconds';
end $$;

create or replace function public.my_competition_history() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not el_zhady_private.is_permanent() then raise exception 'REGISTERED_REQUIRED' using errcode='42501';end if;
 -- Lazy archive covers legacy result writes on still-existing rooms as well.
 perform el_zhady_private.archive_room_results(m.room_id) from el_zhady_private.memberships m where m.user_id=auth.uid() and m.identity_kind='registered';
 return coalesce((select jsonb_agg(jsonb_build_object('session_id',h.source_id,'participant_id',h.participant_id,'room_title',h.room_title,'room_code',h.room_code,
 'display_name',h.display_name,'display_suffix',h.display_suffix,'score',h.score,'max_score',h.max_score,'recorded_at',h.recorded_at,
 'scoring_kind',case when h.source_kind='legacy' then 'legacy_100' else 'live_quiz_raw' end,
 'question_count',h.max_score/1100,'correct_count',h.correct_count,'speed_points',h.speed_points,'rank',case when h.visible then h.rank end,'eligible',h.eligible)
 order by h.recorded_at desc) from el_zhady_private.saved_competition_history h
 where h.registered_user_id=auth.uid() and h.identity_kind='registered' and (h.visible or h.room_closed)
 and (h.source_kind<>'round' or not exists(select 1 from el_zhady_private.saved_competition_history f where f.source_kind='competition' and f.source_id=h.competition_id and f.participant_id=h.participant_id))),'[]'::jsonb);
end $$;

create or replace function public.admin_create_room(p_request_id uuid, p_title text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.rooms; v_id uuid; v_title text; v_code text; v_count integer;
begin
  if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if p_request_id is null then raise exception 'INVALID_REQUEST'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 1));
  select room_id into v_id from el_zhady_private.room_requests where admin_id = auth.uid() and request_id = p_request_id;
  if found then if v_id is null then raise exception 'ROOM_DELETED'; end if; select * into v_room from public.rooms where id = v_id; return to_jsonb(v_room); end if;
  v_title := regexp_replace(btrim(p_title), '\s+', ' ', 'g');
  if v_title is null or char_length(v_title) not between 2 and 80 or v_title ~ '[[:cntrl:]<>]' then raise exception 'INVALID_TITLE'; end if;
  select count(*) into v_count from el_zhady_private.room_requests where admin_id = auth.uid() and created_at > now() - interval '1 hour';
  if v_count >= 5 then raise exception 'ROOM_CREATE_LIMIT'; end if;
  -- UUID randomness, not an incrementing/predictable room identifier.
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    if exists(select 1 from el_zhady_private.retired_room_codes where code=v_code) then continue;end if;
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
create function public.admin_competition_round_review(p_room_id uuid,p_round_number integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.live_quiz_sessions; v_revealed integer;
begin
  if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  select * into s from public.live_quiz_sessions where room_id=p_room_id and round_number=p_round_number;
  if not found then return '[]'::jsonb; end if;
  perform el_zhady_private.sync_live_quiz(s.id);
  select * into s from public.live_quiz_sessions where id=s.id;
  v_revealed:=least(10,s.phase_step/2);
  return coalesce((select jsonb_agg(jsonb_build_object('question_id',q.question_id,'ordinal',q.ordinal,'prompt',q.prompt,'options',q.options,
    'correct_option_id',q.correct_option_id,'explanation',q.explanation,'source_refs',q.source_refs,
    'answers',(select jsonb_agg(jsonb_build_object('participant_id',r.participant_id,'display_name',r.display_name_snapshot,'display_suffix',r.display_suffix,
      'option_id',a.option_id,'is_correct',coalesce(a.is_correct,false),'raw_points',coalesce(a.raw_points,0),'received_at',a.received_at) order by r.display_suffix)
      from el_zhady_private.live_quiz_roster r left join el_zhady_private.live_quiz_answers a on a.session_id=r.session_id and a.participant_id=r.participant_id and a.question_id=q.question_id where r.session_id=s.id)) order by q.ordinal)
    from el_zhady_private.live_quiz_snapshot q where q.session_id=s.id and q.ordinal<=v_revealed),'[]'::jsonb);
end $$;

create or replace function public.admin_live_quiz_review(p_room_id uuid) returns jsonb
language sql security definer set search_path='' as $$
 select public.admin_competition_round_review(p_room_id,(select current_round from public.live_competitions where room_id=p_room_id));
$$;
-- Existing Stage 3 completed games were already public. Preserve their exact
-- earned results/ranks and treat them as previously revealed one-round matches.
insert into el_zhady_private.competition_final_results
 select s.competition_id,r.participant_id,r.display_name_snapshot,r.display_suffix,r.correct_count,r.speed_points,r.raw_points,r.eligible,r.rank,r.recorded_at
 from public.live_quiz_results r join public.live_quiz_sessions s on s.id=r.session_id;
do $$ declare r record;begin
 for r in select id from public.rooms loop perform el_zhady_private.archive_room_results(r.id);end loop;
end $$;
revoke all on all functions in schema el_zhady_private from public,anon,authenticated;
grant execute on function el_zhady_private.is_permanent(),el_zhady_private.is_admin(),el_zhady_private.can_view_room(uuid),el_zhady_private.owns_registered_participant(uuid) to authenticated;
revoke all on function public.configure_competition(uuid,jsonb),public.start_competition_round(uuid,integer),public.reveal_competition_results(uuid),
 public.admin_delete_room(uuid),public.admin_competition_round_review(uuid,integer) from public,anon,authenticated;
grant execute on function public.configure_competition(uuid,jsonb),public.start_competition_round(uuid,integer),public.reveal_competition_results(uuid),
 public.admin_delete_room(uuid),public.admin_competition_round_review(uuid,integer) to authenticated;
commit;
