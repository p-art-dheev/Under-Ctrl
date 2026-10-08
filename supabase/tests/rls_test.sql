-- Two-user authorization checks for the Cognify migration.
\set ON_ERROR_STOP 1
insert into auth.users values ('11111111-1111-1111-1111-111111111111','a@x'), ('22222222-2222-2222-2222-222222222222','b@x');
insert into learning_goals (id, owner_id, goal_text, experience, daily_minutes, explanation_format)
  values ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Learn Python','some',30,'examples');
insert into courses (id, goal_id, owner_id, title, status, content_mode)
  values ('cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Py','setup','fixture');

-- service role commits a skill, question and key for user A
set role service_role;
select sf_commit('11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000001', 0, 'k1', jsonb_build_object(
  'course', jsonb_build_object('graph_version', 1),
  'upsert', jsonb_build_object(
    'skills', jsonb_build_array(jsonb_build_object('id','dddddddd-0000-0000-0000-000000000001','course_id','cccccccc-0000-0000-0000-000000000001','owner_id','11111111-1111-1111-1111-111111111111','key','lists','title','Lists','objective','o','goal_contribution','g','estimated_minutes',10,'kind','core','order_index',0,'difficulty','standard','created_version',1,'created_at',now())),
    'questions', jsonb_build_array(jsonb_build_object('id','eeeeeeee-0000-0000-0000-000000000001','course_id','cccccccc-0000-0000-0000-000000000001','owner_id','11111111-1111-1111-1111-111111111111','group_id','eeeeeeee-0000-0000-0000-0000000000ff','group_kind','practice','skill_ids',jsonb_build_array('dddddddd-0000-0000-0000-000000000001'),'type','mcq','prompt','p','options',jsonb_build_array('a','b'),'difficulty','easy','position',0,'allow_hints',true,'created_at',now())),
    'question_keys', jsonb_build_array(jsonb_build_object('question_id','eeeeeeee-0000-0000-0000-000000000001','course_id','cccccccc-0000-0000-0000-000000000001','owner_id','11111111-1111-1111-1111-111111111111','correct_option',1,'option_tags','{}'::jsonb,'rubric','[]'::jsonb,'hint','h','explanation','e'))
  )));
-- duplicate key is ignored
select sf_commit('11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000001', 0, 'k1', '{}'::jsonb) ->> 'status' as dup_status;
-- stale expected version is rejected
do $$ begin
  perform sf_commit('11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000001', 0, 'k2', '{}'::jsonb);
  raise exception 'FAIL: stale version accepted';
exception when serialization_failure then raise notice 'PASS: stale version rejected'; end $$;
-- rows owned by someone else are rejected
do $$ begin
  perform sf_commit('11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000001', null, null,
    jsonb_build_object('upsert', jsonb_build_object('skill_mastery', jsonb_build_array(jsonb_build_object('skill_id','dddddddd-0000-0000-0000-000000000001','course_id','cccccccc-0000-0000-0000-000000000001','owner_id','22222222-2222-2222-2222-222222222222','evidence_count',0,'correct_no_hint',0,'provisional',true,'unlock_override',false,'updated_at',now())))));
  raise exception 'FAIL: foreign owner accepted';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'PASS: foreign owner rejected (%)', sqlerrm;
end $$;
reset role;

-- user A sees own rows but never the answer key
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select count(*) as a_skills from skills;
do $$ begin
  perform * from question_keys;
  raise exception 'FAIL: learner read question_keys';
exception when insufficient_privilege then raise notice 'PASS: question_keys not readable by learner'; end $$;
do $$ begin
  update skill_mastery set score = 1;
  raise exception 'FAIL: learner wrote mastery';
exception when insufficient_privilege then raise notice 'PASS: learner cannot write mastery'; end $$;
do $$ begin
  perform sf_commit('11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000001', null, null, '{}'::jsonb);
  raise exception 'FAIL: learner executed sf_commit';
exception when insufficient_privilege then raise notice 'PASS: learner cannot execute sf_commit'; end $$;

-- user B sees nothing of A's and cannot attach rows to A's course
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$ declare n int; begin
  select (select count(*) from courses) + (select count(*) from skills) + (select count(*) from questions)
       + (select count(*) from learning_goals) into n;
  if n <> 0 then raise exception 'FAIL: user B sees % of A''s rows', n; end if;
  raise notice 'PASS: user B sees none of A''s goals/courses/skills/questions';
end $$;
do $$ begin
  insert into tutor_messages (course_id, owner_id, skill_id, role, content)
    values ('cccccccc-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','dddddddd-0000-0000-0000-000000000001','learner','hi');
  raise exception 'FAIL: B attached a tutor message to A''s course';
exception when insufficient_privilege then raise notice 'PASS: B cannot write into A''s course'; end $$;
reset role;
select 'ALL CHECKS PASSED' as result;
