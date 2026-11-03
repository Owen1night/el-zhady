begin;
-- DRAFT: run once only after review, with games stopped. Never rerun applied files/Cron.
do $$ begin if exists(select 1 from public.live_quiz_sessions where status='running') or exists(select 1 from public.live_competitions where status in('running','between_rounds')) then
 raise exception 'Finish active competitions before applying mixed games';end if;end $$;
alter table el_zhady_private.live_quiz_questions add column game_kind text not null default 'quiz' check(game_kind in('quiz','map','timeline'));
alter table el_zhady_private.live_quiz_questions add column payload jsonb not null default '{}'::jsonb;
alter table el_zhady_private.live_quiz_questions add column content_key text generated always as (md5(regexp_replace(lower(btrim(prompt)),'\s+',' ','g'))) stored;
alter table el_zhady_private.live_quiz_snapshot add column game_kind text not null default 'quiz';
alter table el_zhady_private.live_quiz_snapshot add column payload jsonb not null default '{}'::jsonb;
alter table el_zhady_private.live_quiz_snapshot add column time_saved_seconds numeric not null default 0 check(time_saved_seconds>=0);
alter table el_zhady_private.live_quiz_snapshot add column closed_early_at timestamptz;
alter table el_zhady_private.live_quiz_snapshot add column content_key text generated always as (md5(regexp_replace(lower(btrim(prompt)),'\s+',' ','g'))) stored;
alter table public.live_quiz_sessions add column game_kind text not null default 'quiz' check(game_kind in('quiz','map','timeline'));
alter table public.live_quiz_sessions add column question_seconds integer not null default 15 check(question_seconds in(15,25,40));
-- New reservations do not rewrite any previously played room, snapshot or result.
create table el_zhady_private.room_question_draws (
 room_id uuid not null references public.rooms(id) on delete cascade,
 content_key text not null,session_id uuid not null references public.live_quiz_sessions(id) on delete cascade,
 question_id uuid not null,primary key(room_id,content_key),unique(session_id,question_id)
);
alter table el_zhady_private.room_question_draws enable row level security;
revoke all on el_zhady_private.room_question_draws from public,anon,authenticated;
create function el_zhady_private.question_opens(p_session_id uuid,p_ordinal integer) returns timestamptz
language sql stable security definer set search_path='' as $$
 select s.starts_at+(p_ordinal-1)*(s.question_seconds+5)*interval '1 second'
 -coalesce((select sum(q.time_saved_seconds) from el_zhady_private.live_quiz_snapshot q where q.session_id=s.id and q.ordinal<p_ordinal),0)*interval '1 second'
 from public.live_quiz_sessions s where s.id=p_session_id;
$$;
create function el_zhady_private.question_deadline(p_session_id uuid,p_ordinal integer) returns timestamptz
language sql stable security definer set search_path='' as $$
 select el_zhady_private.question_opens(s.id,p_ordinal)+(s.question_seconds-q.time_saved_seconds)*interval '1 second'
 from public.live_quiz_sessions s join el_zhady_private.live_quiz_snapshot q on q.session_id=s.id and q.ordinal=p_ordinal where s.id=p_session_id;
$$;
create function el_zhady_private.validate_lineup_capacity(p_lineup jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare x record; n integer;
begin
 if p_lineup is null or jsonb_typeof(p_lineup)<>'array' or jsonb_array_length(p_lineup) not between 1 and 3 then raise exception 'INVALID_LINEUP';end if;
 if (select count(*) from jsonb_array_elements(p_lineup) elem where elem->>'game_kind'='map')>1
 or (select count(*) from jsonb_array_elements(p_lineup) elem where elem->>'game_kind'='timeline')>1 then raise exception 'INVALID_LINEUP';end if;
 for x in select i->>'set_version' version,i->>'game_kind' kind,count(*) rounds from jsonb_array_elements(p_lineup) i group by 1,2 loop
  if x.kind is null or x.kind not in('quiz','map','timeline') or not exists(select 1 from el_zhady_private.live_quiz_sets where version=x.version and published) then raise exception 'INVALID_LINEUP';end if;
  select count(distinct content_key) into n from el_zhady_private.live_quiz_questions where set_version=x.version and game_kind=x.kind;
  if n<x.rounds*10 then raise exception 'INSUFFICIENT_QUESTION_BANK';end if;
 end loop;
end $$;
create or replace function public.configure_competition(p_room_id uuid,p_lineup jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.live_competitions;r public.rooms;item jsonb;n integer:=0;
begin
 if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.status='closed' then raise exception 'ROOM_CLOSED';end if;
 select * into c from public.live_competitions where room_id=p_room_id for update;
 if found and (c.status<>'ready' or c.started_at is not null) then raise exception 'QUIZ_ALREADY_STARTED';end if;
 perform el_zhady_private.validate_lineup_capacity(p_lineup);
 insert into public.live_competitions(room_id) values(p_room_id) on conflict(room_id) do nothing;
 select * into c from public.live_competitions where room_id=p_room_id for update;
 for item in select value from jsonb_array_elements(p_lineup) loop
  n:=n+1;
  insert into public.live_quiz_sessions(room_id,competition_id,round_number,set_version,game_kind,question_seconds) values(p_room_id,c.id,n,item->>'set_version',item->>'game_kind',case item->>'game_kind' when 'map' then 25 when 'timeline' then 40 else 15 end)
  on conflict(competition_id,round_number) do update set set_version=excluded.set_version,game_kind=excluded.game_kind,question_seconds=excluded.question_seconds;
 end loop;
 delete from public.live_quiz_sessions where competition_id=c.id and round_number>n;
 return jsonb_build_object('competition_id',c.id,'round_count',n);
end $$;
create or replace function el_zhady_private.draw_quiz_round(p_session_id uuid,p_version text) returns void
language plpgsql security definer set search_path='' as $$
declare s public.live_quiz_sessions; q record; n integer:=0;
begin
 select * into s from public.live_quiz_sessions where id=p_session_id;
 if (select count(*) from el_zhady_private.live_quiz_snapshot where session_id=s.id)=10 then return;end if;
 for q in select * from (
 select distinct on(content_key) * from el_zhady_private.live_quiz_questions b
 where set_version=p_version and game_kind=s.game_kind and not exists(
 select 1 from el_zhady_private.room_question_draws d where d.room_id=s.room_id and d.content_key=b.content_key)
 order by content_key) b order by random() limit 10 loop
  n:=n+1;
  if jsonb_array_length(q.options)<>4 or (select count(distinct o->>'id') from jsonb_array_elements(q.options) o)<>4
  or (q.game_kind<>'timeline' and not exists(select 1 from jsonb_array_elements(q.options) o where o->>'id'=q.correct_option_id))
  or (q.game_kind='timeline' and (select array_agg(o->>'id' order by o->>'id') from jsonb_array_elements(q.options) o) is distinct from
  (select array_agg(v order by v) from unnest(string_to_array(q.correct_option_id,'>')) v)) then raise exception 'QUIZ_NOT_CONFIGURED';end if;
  insert into el_zhady_private.room_question_draws values(s.room_id,q.content_key,s.id,q.id);
  insert into el_zhady_private.live_quiz_snapshot(session_id,question_id,ordinal,prompt,options,correct_option_id,explanation,source_refs,game_kind,payload)
  values(s.id,q.id,n,q.prompt,q.options,q.correct_option_id,q.explanation,q.source_refs,q.game_kind,q.payload);
 end loop;
 if n<>10 then raise exception 'INSUFFICIENT_QUESTION_BANK';end if;
end $$;
create function el_zhady_private.reserve_competition_questions(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s record;lineup jsonb;
begin
 select jsonb_agg(jsonb_build_object('game_kind',game_kind,'set_version',set_version) order by round_number) into lineup from public.live_quiz_sessions where competition_id=p_id;
 perform el_zhady_private.validate_lineup_capacity(lineup);
 for s in select * from public.live_quiz_sessions where competition_id=p_id order by round_number loop
  perform el_zhady_private.draw_quiz_round(s.id,s.set_version);
 end loop;
end $$;
create or replace function public.start_competition_round(p_room_id uuid,p_round_number integer) returns jsonb
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
  perform el_zhady_private.reserve_competition_questions(c.id);
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
create or replace function el_zhady_private.sync_live_quiz_stage3(p_session_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.live_quiz_sessions; v_now timestamptz; v_elapsed numeric; v_step integer;
begin
  select * into s from public.live_quiz_sessions where id=p_session_id for update;
  if not found or s.status<>'running' then return; end if;
  v_now:=el_zhady_private.live_quiz_clock();
  v_elapsed:=extract(epoch from(v_now-s.starts_at))+(select coalesce(sum(time_saved_seconds),0) from el_zhady_private.live_quiz_snapshot where session_id=s.id);
  if v_elapsed<0 then v_step:=0;
  elsif v_elapsed>=10*(s.question_seconds+5) then v_step:=21;
  else v_step:=1+2*floor(v_elapsed/(s.question_seconds+5))::integer+case when mod(v_elapsed,s.question_seconds+5)>=s.question_seconds then 1 else 0 end;
  end if;
  v_step:=greatest(v_step,s.phase_step); -- repeat/clock correction cannot reset a phase
  if v_step=21 then
    insert into public.live_quiz_results(session_id,participant_id,room_id,display_name_snapshot,display_suffix,correct_count,speed_points,eligible,rank,recorded_at)
    select p_session_id,a.participant_id,s.room_id,a.display_name_snapshot,a.display_suffix,a.correct_count,a.speed_points,a.eligible,
      case when a.eligible then rank() over(partition by a.eligible order by a.correct_count desc,a.speed_points desc)::integer else null end,
      v_now
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
create or replace function public.submit_live_quiz_answer(p_session_id uuid,p_question_id uuid,p_option_id text) returns jsonb
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
  v_open:=el_zhady_private.question_opens(s.id,q.ordinal); v_end:=el_zhady_private.question_deadline(s.id,q.ordinal);
  if v_now<v_open or v_now>=v_end or s.phase_step<>2*q.ordinal-1 then raise exception 'ANSWER_WINDOW_CLOSED'; end if;
  if p_option_id is null or length(p_option_id)>300 then raise exception 'INVALID_OPTION';end if;
  if q.game_kind='timeline' then
   if (select array_agg(x->>'id' order by x->>'id') from jsonb_array_elements(q.options) x) is distinct from
   (select array_agg(x order by x) from unnest(string_to_array(p_option_id,'>')) x) then raise exception 'INVALID_OPTION';end if;
  elsif not exists(select 1 from jsonb_array_elements(q.options) x where x->>'id'=p_option_id) then raise exception 'INVALID_OPTION';end if;
  v_correct:=(p_option_id=q.correct_option_id);
  v_speed:=case when v_correct then greatest(0,least(100,floor(100*extract(epoch from(v_end-v_now))/s.question_seconds)::integer)) else 0 end;
  insert into el_zhady_private.live_quiz_answers values(s.id,v_pid,q.question_id,p_option_id,v_now,v_correct,v_speed,case when v_correct then 1000+v_speed else 0 end)
    returning * into a;
  return jsonb_build_object('accepted',true,'option_id',a.option_id,'received_at',a.received_at);
end $$;
create or replace function el_zhady_private.quiz_round_state(p_session_id uuid) returns jsonb
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
      'game_kind',q.game_kind,'payload',q.payload,'opens_at',el_zhady_private.question_opens(s.id,q.ordinal),'deadline',el_zhady_private.question_deadline(s.id,q.ordinal));
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
    'phase_ends_at',case when v_phase='countdown' then s.starts_at when v_phase='question' then el_zhady_private.question_deadline(s.id,v_ordinal)
      when v_phase='reveal' then el_zhady_private.question_deadline(s.id,v_ordinal)+interval '5 seconds' else null end,
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
 'lineup',(select jsonb_agg(jsonb_build_object('round_number',round_number,'game_kind',game_kind,'set_version',set_version,'status',status) order by round_number) from public.live_quiz_sessions where competition_id=c.id),
 'leaderboard',case when v_admin then v->'leaderboard' else '[]'::jsonb end,
 'final_standings',case when v_admin then board else '[]'::jsonb end,'podium',podium,'own_result',own);
end $$;
create function public.end_live_question(p_room_id uuid,p_session_id uuid,p_question_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.live_quiz_sessions;q el_zhady_private.live_quiz_snapshot;v_now timestamptz;v_end timestamptz;
begin
 if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 perform 1 from public.rooms where id=p_room_id and status<>'closed' for update;
 if not found then raise exception 'ROOM_CLOSED';end if;
 select * into s from public.live_quiz_sessions where id=p_session_id and room_id=p_room_id;
 if not found then raise exception 'INVALID_QUESTION';end if;
 -- Same room -> competition -> session lock order as submissions/start/Cron.
 perform el_zhady_private.sync_live_quiz(p_session_id);
 select * into s from public.live_quiz_sessions where id=p_session_id for update;
 select * into q from el_zhady_private.live_quiz_snapshot where session_id=s.id and question_id=p_question_id;
 if not found then raise exception 'INVALID_QUESTION';end if;
 if s.status<>'running' or s.phase_step<>2*q.ordinal-1 or q.closed_early_at is not null then
  return jsonb_build_object('closed',false,'reason','QUESTION_ALREADY_CLOSED');end if;
 v_now:=el_zhady_private.live_quiz_clock();v_end:=el_zhady_private.question_deadline(s.id,q.ordinal);
 if v_now<el_zhady_private.question_opens(s.id,q.ordinal) or v_now>=v_end then
  return jsonb_build_object('closed',false,'reason','QUESTION_ALREADY_CLOSED');end if;
 update el_zhady_private.live_quiz_snapshot set closed_early_at=v_now,time_saved_seconds=extract(epoch from(v_end-v_now)) where session_id=s.id and question_id=q.question_id;
 perform el_zhady_private.sync_live_quiz(s.id);
 return jsonb_build_object('closed',true,'question_id',q.question_id);
end $$;
revoke all on function public.end_live_question(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.end_live_question(uuid,uuid,uuid) to authenticated;
revoke all on all functions in schema el_zhady_private from public,anon,authenticated;
grant execute on function el_zhady_private.is_permanent(),el_zhady_private.is_admin(),el_zhady_private.can_view_room(uuid),el_zhady_private.owns_registered_participant(uuid) to authenticated;
create or replace function public.available_live_quizzes() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not el_zhady_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('version',s.version,'title',s.title,'question_count',10,'counts',jsonb_build_object('quiz',(select count(distinct content_key) from el_zhady_private.live_quiz_questions where set_version=s.version and game_kind='quiz'),'map',(select count(distinct content_key) from el_zhady_private.live_quiz_questions where set_version=s.version and game_kind='map'),'timeline',(select count(distinct content_key) from el_zhady_private.live_quiz_questions where set_version=s.version and game_kind='timeline')),'bank_size',(select count(*) from el_zhady_private.live_quiz_questions where set_version=s.version)) order by s.checked_on desc,s.version)
 from el_zhady_private.live_quiz_sets s where published and (select count(*) from el_zhady_private.live_quiz_questions where set_version=s.version)>=10),'[]'::jsonb);
end $$;
commit;
