begin;
-- Stage 3 only. Do not rerun or edit the already-applied Stage 2 migration.
create table el_zhady_private.live_quiz_sets (
  version text primary key, title text not null, published boolean not null default false,
  private_marker text not null, checked_on date not null
);
create table el_zhady_private.live_quiz_questions (
  id uuid primary key, set_version text not null references el_zhady_private.live_quiz_sets(version),
  ordinal integer not null check(ordinal between 1 and 10), prompt text not null,
  options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options)=4),
  correct_option_id text not null, explanation text not null,
  source_refs jsonb not null check(jsonb_typeof(source_refs)='array' and jsonb_array_length(source_refs)>0),
  unique(set_version,ordinal)
);
create table public.live_quiz_sessions (
  id uuid primary key default gen_random_uuid(), room_id uuid not null unique references public.rooms(id),
  set_version text not null references el_zhady_private.live_quiz_sets(version),
  status text not null default 'ready' check(status in('ready','running','completed','cancelled')),
  phase_step integer not null default 0 check(phase_step between 0 and 21),
  starts_at timestamptz, finalized_at timestamptz, cancelled_at timestamptz,
  roster_count integer not null default 0, updated_at timestamptz not null default now()
);
create table el_zhady_private.live_quiz_snapshot (
  session_id uuid not null references public.live_quiz_sessions(id), question_id uuid not null,
  ordinal integer not null check(ordinal between 1 and 10), prompt text not null, options jsonb not null,
  correct_option_id text not null, explanation text not null, source_refs jsonb not null,
  primary key(session_id,question_id), unique(session_id,ordinal)
);
create table el_zhady_private.live_quiz_roster (
  session_id uuid not null references public.live_quiz_sessions(id),
  participant_id uuid not null references public.room_participants(id),
  display_name_snapshot text not null, display_suffix integer not null,
  identity_kind text not null check(identity_kind in('guest','registered')),
  primary key(session_id,participant_id)
);
create table el_zhady_private.live_quiz_answers (
  session_id uuid not null, participant_id uuid not null, question_id uuid not null,
  option_id text not null, received_at timestamptz not null,
  is_correct boolean not null, speed_points integer not null check(speed_points between 0 and 100),
  raw_points integer not null check(raw_points between 0 and 1100),
  primary key(session_id,participant_id,question_id),
  foreign key(session_id,participant_id) references el_zhady_private.live_quiz_roster,
  foreign key(session_id,question_id) references el_zhady_private.live_quiz_snapshot,
  check((is_correct and raw_points=1000+speed_points) or (not is_correct and raw_points=0 and speed_points=0))
);
create index live_answers_question on el_zhady_private.live_quiz_answers(session_id,question_id);
create table public.live_quiz_results (
  session_id uuid not null references public.live_quiz_sessions(id),
  participant_id uuid not null references public.room_participants(id), room_id uuid not null references public.rooms(id),
  display_name_snapshot text not null, display_suffix integer not null,
  correct_count integer not null check(correct_count between 0 and 10),
  speed_points integer not null check(speed_points between 0 and 1000),
  raw_points integer generated always as (1000*correct_count+speed_points) stored,
  eligible boolean not null, rank integer, recorded_at timestamptz not null,
  primary key(session_id,participant_id), check(speed_points<=100*correct_count),
  check((eligible and rank>0) or (not eligible and rank is null))
);
alter table public.live_quiz_sessions enable row level security;
alter table public.live_quiz_results enable row level security;
alter table el_zhady_private.live_quiz_sets enable row level security;
alter table el_zhady_private.live_quiz_questions enable row level security;
alter table el_zhady_private.live_quiz_snapshot enable row level security;
alter table el_zhady_private.live_quiz_roster enable row level security;
alter table el_zhady_private.live_quiz_answers enable row level security;
revoke all on public.live_quiz_sessions,public.live_quiz_results,
  el_zhady_private.live_quiz_sets,el_zhady_private.live_quiz_questions,el_zhady_private.live_quiz_snapshot,
  el_zhady_private.live_quiz_roster,el_zhady_private.live_quiz_answers from public,anon,authenticated;
grant select on public.live_quiz_sessions,public.live_quiz_results to authenticated;
create policy live_session_member on public.live_quiz_sessions for select to authenticated
  using(el_zhady_private.can_view_room(room_id));
create policy live_result_member on public.live_quiz_results for select to authenticated
  using(el_zhady_private.can_view_room(room_id) or el_zhady_private.owns_registered_participant(participant_id));

-- No client-supplied clock. This indirection is replaced ONLY in isolated tests.
create function el_zhady_private.live_quiz_clock() returns timestamptz
language sql volatile set search_path='' as $$ select clock_timestamp(); $$;
create function el_zhady_private.live_quiz_scheduler_ready() returns boolean
language plpgsql stable security definer set search_path='' as $$
declare v_ready boolean;
begin
  if to_regclass('cron.job') is null then return false; end if;
  execute 'select exists(select 1 from cron.job where jobname=$1 and active and database=current_database() and command=$2)'
    into v_ready using 'el-zhady-live-quiz-v1','select el_zhady_private.tick_live_quizzes();';
  return v_ready;
end $$;

create function el_zhady_private.sync_live_quiz(p_session_id uuid) returns void
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
create function el_zhady_private.tick_live_quizzes() returns void
language plpgsql security definer set search_path='' as $$
declare r record;
begin
  for r in select id from public.live_quiz_sessions where status='running' order by starts_at for update skip locked limit 100 loop
    perform el_zhady_private.sync_live_quiz(r.id);
  end loop;
end $$;

-- Scores are projected only through the latest reveal. No live correctness leak.
create function el_zhady_private.live_quiz_board(p_session_id uuid,p_revealed integer,p_ranked boolean) returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'participant_id',b.participant_id,'display_name',b.display_name_snapshot,'display_suffix',b.display_suffix,
    'correct_count',b.correct_count,'speed_points',b.speed_points,'raw_points',1000*b.correct_count+b.speed_points,
    'eligible',b.eligible,'rank',case when p_ranked and b.eligible then b.place else null end)
    order by b.eligible desc,b.correct_count desc,b.speed_points desc,b.display_suffix),'[]'::jsonb)
  from (
    select a.*,rank() over(partition by a.eligible order by a.correct_count desc,a.speed_points desc)::integer place
    from (
      select r.participant_id,r.display_name_snapshot,r.display_suffix,
        count(ans.question_id) filter(where ans.is_correct and q.ordinal<=p_revealed)::integer correct_count,
        coalesce(sum(ans.speed_points) filter(where q.ordinal<=p_revealed),0)::integer speed_points,
        (p.status='active' and not coalesce(m.removed,true)) eligible
      from el_zhady_private.live_quiz_roster r
      join public.room_participants p on p.id=r.participant_id
      left join el_zhady_private.memberships m on m.participant_id=r.participant_id
      left join el_zhady_private.live_quiz_answers ans on ans.session_id=r.session_id and ans.participant_id=r.participant_id
      left join el_zhady_private.live_quiz_snapshot q on q.session_id=ans.session_id and q.question_id=ans.question_id
      where r.session_id=p_session_id
      group by r.participant_id,r.display_name_snapshot,r.display_suffix,p.status,m.removed
    ) a
  ) b;
$$;
create function public.available_live_quizzes() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('version',s.version,'title',s.title,'question_count',10) order by s.version)
    from el_zhady_private.live_quiz_sets s where s.published and (select count(*) from el_zhady_private.live_quiz_questions q where q.set_version=s.version)=10),'[]'::jsonb);
end $$;
create function public.configure_live_quiz(p_room_id uuid,p_version text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.live_quiz_sessions; r public.rooms;
begin
  if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  select * into r from public.rooms where id=p_room_id for update;
  if not found or r.status='closed' then raise exception 'ROOM_CLOSED'; end if;
  select * into s from public.live_quiz_sessions where room_id=p_room_id for update;
  if found and s.status<>'ready' then raise exception 'QUIZ_ALREADY_STARTED'; end if;
  if not exists(select 1 from el_zhady_private.live_quiz_sets where version=p_version and published)
    or (select count(*) from el_zhady_private.live_quiz_questions where set_version=p_version)<>10 then raise exception 'QUIZ_NOT_CONFIGURED'; end if;
  insert into public.live_quiz_sessions(room_id,set_version) values(p_room_id,p_version)
    on conflict(room_id) do update set set_version=excluded.set_version,updated_at=el_zhady_private.live_quiz_clock()
    returning * into s;
  return jsonb_build_object('session_id',s.id);
end $$;
create function public.start_live_quiz(p_room_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.live_quiz_sessions; r public.rooms; v_count integer;
begin
  if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  select * into r from public.rooms where id=p_room_id for update;
  select * into s from public.live_quiz_sessions where room_id=p_room_id for update;
  if not found then raise exception 'QUIZ_NOT_CONFIGURED'; end if;
  if s.status in('running','completed') then return jsonb_build_object('session_id',s.id,'starts_at',s.starts_at); end if;
  if s.status='cancelled' then raise exception 'QUIZ_CANCELLED'; end if;
  if r.status='closed' then raise exception 'ROOM_CLOSED'; end if;
  if not el_zhady_private.live_quiz_scheduler_ready() then raise exception 'QUIZ_SCHEDULER_REQUIRED'; end if;
  insert into el_zhady_private.live_quiz_snapshot(session_id,question_id,ordinal,prompt,options,correct_option_id,explanation,source_refs)
    select s.id,id,ordinal,prompt,options,correct_option_id,explanation,source_refs from el_zhady_private.live_quiz_questions where set_version=s.set_version;
  if (select count(*) from el_zhady_private.live_quiz_snapshot where session_id=s.id)<>10
     or exists(select 1 from el_zhady_private.live_quiz_snapshot q where q.session_id=s.id and
       (jsonb_array_length(q.options)<>4 or (select count(distinct x->>'id') from jsonb_array_elements(q.options) x)<>4
       or not exists(select 1 from jsonb_array_elements(q.options) x where x->>'id'=q.correct_option_id))) then raise exception 'QUIZ_NOT_CONFIGURED'; end if;
  -- Merely hosting never creates a competitor. Exclude the starting host even if
  -- they previously joined by code; all other active memberships are frozen.
  insert into el_zhady_private.live_quiz_roster(session_id,participant_id,display_name_snapshot,display_suffix,identity_kind)
    select s.id,p.id,p.display_name,p.display_suffix,m.identity_kind
    from public.room_participants p join el_zhady_private.memberships m on m.participant_id=p.id
    where p.room_id=p_room_id and p.status='active' and not m.removed and m.user_id<>auth.uid();
  get diagnostics v_count=row_count;
  if v_count<1 then raise exception 'NO_PARTICIPANTS'; end if;
  update public.rooms set locked=true,updated_at=el_zhady_private.live_quiz_clock() where id=p_room_id;
  update public.live_quiz_sessions set status='running',starts_at=el_zhady_private.live_quiz_clock()+interval '3 seconds',
    roster_count=v_count,updated_at=el_zhady_private.live_quiz_clock() where id=s.id returning * into s;
  return jsonb_build_object('session_id',s.id,'starts_at',s.starts_at);
end $$;

create function public.live_quiz_state(p_room_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.live_quiz_sessions; q el_zhady_private.live_quiz_snapshot; a el_zhady_private.live_quiz_answers;
  v_now timestamptz; v_phase text; v_ordinal integer; v_revealed integer; v_pid uuid; v_options jsonb; v_question jsonb; v_answer jsonb; v_board jsonb;
begin
  if not el_zhady_private.can_view_room(p_room_id) then raise exception 'ROOM_ACCESS_DENIED' using errcode='42501'; end if;
  select * into s from public.live_quiz_sessions where room_id=p_room_id;
  if not found then return jsonb_build_object('session',null,'server_now',el_zhady_private.live_quiz_clock()); end if;
  perform el_zhady_private.sync_live_quiz(s.id);
  -- A removal may have committed while this read waited for the session lock.
  -- Recheck after serialization before exposing the new phase/question.
  if not el_zhady_private.can_view_room(p_room_id) then raise exception 'ROOM_ACCESS_DENIED' using errcode='42501'; end if;
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

create function public.submit_live_quiz_answer(p_session_id uuid,p_question_id uuid,p_option_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.live_quiz_sessions; q el_zhady_private.live_quiz_snapshot; a el_zhady_private.live_quiz_answers;
  v_pid uuid; v_room uuid; v_now timestamptz; v_open timestamptz; v_end timestamptz; v_correct boolean; v_speed integer;
begin
  select room_id into v_room from public.live_quiz_sessions where id=p_session_id;
  if v_room is null or not el_zhady_private.can_view_room(v_room) then raise exception 'ROOM_ACCESS_DENIED' using errcode='42501'; end if;
  perform 1 from public.rooms where id=v_room for update;
  select m.participant_id into v_pid from el_zhady_private.memberships m
    where m.room_id=v_room and m.user_id=auth.uid() and not m.removed
      and exists(select 1 from el_zhady_private.live_quiz_roster r where r.session_id=p_session_id and r.participant_id=m.participant_id);
  if v_pid is null then raise exception 'NOT_IN_ROSTER' using errcode='42501'; end if;
  select * into a from el_zhady_private.live_quiz_answers where session_id=p_session_id and participant_id=v_pid and question_id=p_question_id;
  if found then return jsonb_build_object('accepted',true,'option_id',a.option_id,'received_at',a.received_at); end if;
  perform el_zhady_private.sync_live_quiz(p_session_id);
  select * into s from public.live_quiz_sessions where id=p_session_id for update;
  v_now:=el_zhady_private.live_quiz_clock(); -- authoritative receipt/validation time after serialization
  if s.status<>'running' then raise exception 'QUIZ_NOT_RUNNING'; end if;
  select * into q from el_zhady_private.live_quiz_snapshot where session_id=s.id and question_id=p_question_id;
  if not found then raise exception 'INVALID_QUESTION'; end if;
  v_open:=s.starts_at+(q.ordinal-1)*interval '20 seconds'; v_end:=v_open+interval '15 seconds';
  if v_now<v_open or v_now>=v_end or s.phase_step<>2*q.ordinal-1 then raise exception 'ANSWER_WINDOW_CLOSED'; end if;
  if p_option_id is null or not exists(select 1 from jsonb_array_elements(q.options) x where x->>'id'=p_option_id) then raise exception 'INVALID_OPTION'; end if;
  v_correct:=(p_option_id=q.correct_option_id);
  v_speed:=case when v_correct then greatest(0,least(100,floor(100*extract(epoch from(v_end-v_now))/15)::integer)) else 0 end;
  insert into el_zhady_private.live_quiz_answers values(s.id,v_pid,q.question_id,p_option_id,v_now,v_correct,v_speed,case when v_correct then 1000+v_speed else 0 end)
    returning * into a;
  return jsonb_build_object('accepted',true,'option_id',a.option_id,'received_at',a.received_at);
end $$;

create function public.cancel_live_quiz(p_room_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.live_quiz_sessions;
begin
  if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  perform 1 from public.rooms where id=p_room_id for update;
  select * into s from public.live_quiz_sessions where room_id=p_room_id for update;
  if not found then raise exception 'QUIZ_NOT_CONFIGURED'; end if;
  perform el_zhady_private.sync_live_quiz(s.id);
  select * into s from public.live_quiz_sessions where id=s.id;
  if s.status='cancelled' then return; end if;
  if s.status='completed' then raise exception 'QUIZ_ALREADY_FINISHED'; end if;
  update public.live_quiz_sessions set status='cancelled',cancelled_at=el_zhady_private.live_quiz_clock(),updated_at=el_zhady_private.live_quiz_clock() where id=s.id;
  update public.rooms set status='closed',locked=true,updated_at=el_zhady_private.live_quiz_clock() where id=p_room_id;
end $$;

create function public.admin_live_quiz_review(p_room_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.live_quiz_sessions; v_revealed integer;
begin
  if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  select * into s from public.live_quiz_sessions where room_id=p_room_id;
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

-- Preserve existing room actions; serialize removal with finalization, and never
-- let an unlock/close silently bypass a running quiz's frozen roster/cancel flow.
create or replace function public.admin_room_action(p_room_id uuid,p_action text,p_participant_id uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare v_room public.rooms; s public.live_quiz_sessions;
begin
  if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  select * into v_room from public.rooms where id=p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  select * into s from public.live_quiz_sessions where room_id=p_room_id for update;
  if found then
    perform el_zhady_private.sync_live_quiz(s.id);
    select * into s from public.live_quiz_sessions where id=s.id;
    if s.status='running' and p_action in('close','lock','unlock') then raise exception 'QUIZ_RUNNING'; end if;
    if s.status in('completed','cancelled') and p_action='unlock' then raise exception 'QUIZ_ALREADY_FINISHED'; end if;
  end if;
  if p_action='close' then update public.rooms set status='closed',locked=true,updated_at=now() where id=p_room_id;
  elsif p_action in('lock','unlock') then
    if v_room.status='closed' then raise exception 'ROOM_CLOSED'; end if;
    update public.rooms set locked=(p_action='lock'),updated_at=now() where id=p_room_id;
  elsif p_action='remove' then
    if not exists(select 1 from public.room_participants where id=p_participant_id and room_id=p_room_id) then raise exception 'PARTICIPANT_NOT_FOUND'; end if;
    update el_zhady_private.memberships set removed=true where room_id=p_room_id and participant_id=p_participant_id;
    update public.room_participants set status='removed' where room_id=p_room_id and id=p_participant_id;
  else raise exception 'INVALID_ACTION'; end if;
end $$;

-- Read legacy /100 competition results alongside raw live-quiz history. Practice
-- rows are neither read nor written by any live quiz mutation.
create or replace function public.my_competition_history() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not el_zhady_private.is_permanent() then raise exception 'REGISTERED_REQUIRED' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(x.item order by x.recorded_at desc) from (
    select r.recorded_at,jsonb_build_object('participant_id',r.participant_id,'room_title',room.title,'room_code',room.code,
      'display_name',r.display_name_snapshot,'display_suffix',r.display_suffix,'score',r.score,'max_score',r.max_score,'recorded_at',r.recorded_at,'scoring_kind','legacy_100') item
    from public.competition_results r join el_zhady_private.memberships m on m.participant_id=r.participant_id join public.rooms room on room.id=r.room_id
    where m.user_id=auth.uid() and m.identity_kind='registered'
    union all
    select r.recorded_at,jsonb_build_object('session_id',r.session_id,'participant_id',r.participant_id,'room_title',room.title,'room_code',room.code,
      'display_name',r.display_name_snapshot,'display_suffix',r.display_suffix,'score',r.raw_points,'max_score',11000,'recorded_at',r.recorded_at,
      'scoring_kind','live_quiz_raw','correct_count',r.correct_count,'speed_points',r.speed_points,'rank',r.rank,'eligible',r.eligible)
    from public.live_quiz_results r join public.live_quiz_sessions s on s.id=r.session_id
      join el_zhady_private.live_quiz_roster roster on roster.session_id=r.session_id and roster.participant_id=r.participant_id
      join el_zhady_private.memberships m on m.participant_id=r.participant_id join public.rooms room on room.id=r.room_id
    where s.status='completed' and m.user_id=auth.uid() and m.identity_kind='registered' and roster.identity_kind='registered'
  ) x),'[]'::jsonb);
end $$;

revoke all on function el_zhady_private.live_quiz_clock(),el_zhady_private.live_quiz_scheduler_ready(),el_zhady_private.sync_live_quiz(uuid),
  el_zhady_private.tick_live_quizzes(),el_zhady_private.live_quiz_board(uuid,integer,boolean) from public,anon,authenticated;
revoke all on function public.available_live_quizzes(),public.configure_live_quiz(uuid,text),public.start_live_quiz(uuid),
  public.live_quiz_state(uuid),public.submit_live_quiz_answer(uuid,uuid,text),public.cancel_live_quiz(uuid),public.admin_live_quiz_review(uuid) from public,anon,authenticated;
grant execute on function public.available_live_quizzes(),public.configure_live_quiz(uuid,text),public.start_live_quiz(uuid),
  public.live_quiz_state(uuid),public.submit_live_quiz_answer(uuid,uuid,text),public.cancel_live_quiz(uuid),public.admin_live_quiz_review(uuid) to authenticated;
-- Only the safe session/result projections, never snapshots/answers, are realtime.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.live_quiz_sessions,public.live_quiz_results;
  end if;
end $$;
commit;
