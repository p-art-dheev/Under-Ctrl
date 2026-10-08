-- SkillForge schema, row-level security and the atomic commit function.
--
-- Ownership model
--   * Every row carries owner_id; learners can SELECT only their own rows.
--   * Learner-authored rows (profile, goals, lesson progress, tutor messages,
--     hint requests) are written with the learner's own session under RLS.
--   * Grades, mastery, graph changes, questions and answer keys are written
--     only by public.sf_commit, which only the service role may execute, after
--     the server has verified the signed-in user. Learners cannot write them.
--   * question_keys has RLS enabled and no policies, and its grants are revoked,
--     so answer keys and rubrics are never readable from the browser.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text,
  explanation_format text,
  active_course_id uuid,
  created_at timestamptz not null default now()
);

create table public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  goal_text text not null check (length(goal_text) between 3 and 1000),
  experience text not null,
  daily_minutes int not null check (daily_minutes between 5 and 480),
  explanation_format text not null,
  target_date date,
  interpretation jsonb,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key,
  goal_id uuid not null references public.learning_goals (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  status text not null check (status in ('setup', 'active')),
  graph_version int not null default 0,
  content_mode text not null check (content_mode in ('live', 'fixture')),
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.courses (owner_id);

create table public.skills (
  id uuid primary key,
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  title text not null,
  objective text not null,
  goal_contribution text not null,
  estimated_minutes int not null,
  kind text not null check (kind in ('core', 'remediation')),
  remediates_skill_id uuid references public.skills (id),
  order_index double precision not null,
  difficulty text not null check (difficulty in ('simplified', 'standard', 'accelerated')),
  search_query text,
  created_version int not null,
  created_at timestamptz not null,
  unique (course_id, key)
);

create table public.skill_edges (
  id uuid primary key,
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  prerequisite_id uuid not null references public.skills (id) on delete cascade,
  dependent_id uuid not null references public.skills (id) on delete cascade,
  created_version int not null,
  created_at timestamptz not null,
  unique (prerequisite_id, dependent_id),
  check (prerequisite_id <> dependent_id)
);

create table public.skill_mastery (
  skill_id uuid primary key references public.skills (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  score double precision check (score is null or score between 0 and 1),
  evidence_count int not null default 0,
  correct_no_hint int not null default 0,
  provisional boolean not null default true,
  unlock_override boolean not null default false,
  last_assessed_at timestamptz,
  updated_at timestamptz not null
);

create table public.resources (
  id uuid primary key,
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  source_key text not null,
  url text not null check (url ~ '^https://'),
  title text not null,
  provider text not null,
  excerpt text not null,
  format text not null,
  origin text not null check (origin in ('live_search', 'curated')),
  verification_status text not null,
  selection_reason text not null,
  estimated_minutes int,
  retrieved_at timestamptz not null,
  unique (course_id, source_key)
);

create table public.lessons (
  id uuid primary key,
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  version int not null,
  difficulty text not null,
  content jsonb not null,
  source_keys text[] not null default '{}',
  practice_group_id uuid not null,
  content_mode text not null,
  created_at timestamptz not null,
  unique (skill_id, version)
);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  status text not null check (status in ('started', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  active_minutes int not null default 0 check (active_minutes between 0 and 600),
  unique (owner_id, lesson_id)
);

create table public.questions (
  id uuid primary key,
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid not null,
  group_kind text not null check (group_kind in ('diagnostic_1', 'diagnostic_2', 'practice', 'check', 'followup')),
  lesson_id uuid references public.lessons (id) on delete cascade,
  skill_ids uuid[] not null,
  type text not null check (type in ('mcq', 'short')),
  prompt text not null,
  options jsonb,
  difficulty text not null,
  position int not null,
  allow_hints boolean not null,
  created_at timestamptz not null
);
create index on public.questions (group_id);

-- Private grading data: RLS on, no policies, grants revoked below.
create table public.question_keys (
  question_id uuid primary key references public.questions (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  correct_option int,
  option_tags jsonb not null default '{}'::jsonb,
  rubric jsonb not null default '[]'::jsonb,
  hint text not null,
  explanation text not null
);

create table public.hint_uses (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.assessment_attempts (
  id uuid primary key,
  question_id uuid not null references public.questions (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid not null,
  answer jsonb not null,
  score double precision not null check (score between 0 and 1),
  is_correct boolean not null,
  hint_count int not null default 0,
  confidence double precision,
  dont_understand boolean not null default false,
  feedback text not null,
  misconceptions jsonb not null default '[]'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null,
  -- one graded attempt per question: retries cannot double-count evidence
  unique (owner_id, question_id)
);

create table public.mastery_events (
  id uuid primary key,
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  old_score double precision,
  new_score double precision not null,
  evidence_count int not null,
  attempt_ids uuid[] not null,
  reason text not null,
  created_at timestamptz not null
);

create table public.adaptation_events (
  id uuid primary key,
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  from_version int not null,
  to_version int not null,
  patch jsonb,
  evidence_attempt_ids uuid[] not null default '{}',
  reason text not null,
  created_at timestamptz not null
);

create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  role text not null check (role in ('learner', 'tutor')),
  content text not null check (length(content) <= 6000),
  created_at timestamptz not null default now()
);

-- Idempotency keys for sf_commit: a retried submission is recognised and ignored.
create table public.commit_keys (
  owner_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, key)
);

-- ------------------------------------------------------------------ RLS
alter table public.profiles enable row level security;
alter table public.learning_goals enable row level security;
alter table public.courses enable row level security;
alter table public.skills enable row level security;
alter table public.skill_edges enable row level security;
alter table public.skill_mastery enable row level security;
alter table public.resources enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.questions enable row level security;
alter table public.question_keys enable row level security;
alter table public.hint_uses enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.mastery_events enable row level security;
alter table public.adaptation_events enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.commit_keys enable row level security;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "own goals read" on public.learning_goals for select to authenticated using (owner_id = auth.uid());
create policy "own goals insert" on public.learning_goals for insert to authenticated with check (owner_id = auth.uid());

-- Read-only for learners; written by sf_commit (service role) only.
create policy "own courses read" on public.courses for select to authenticated using (owner_id = auth.uid());
create policy "own skills read" on public.skills for select to authenticated using (owner_id = auth.uid());
create policy "own edges read" on public.skill_edges for select to authenticated using (owner_id = auth.uid());
create policy "own mastery read" on public.skill_mastery for select to authenticated using (owner_id = auth.uid());
create policy "own resources read" on public.resources for select to authenticated using (owner_id = auth.uid());
create policy "own lessons read" on public.lessons for select to authenticated using (owner_id = auth.uid());
create policy "own questions read" on public.questions for select to authenticated using (owner_id = auth.uid());
create policy "own attempts read" on public.assessment_attempts for select to authenticated using (owner_id = auth.uid());
create policy "own mastery events read" on public.mastery_events for select to authenticated using (owner_id = auth.uid());
create policy "own adaptation events read" on public.adaptation_events for select to authenticated using (owner_id = auth.uid());

-- Learner-authored rows: the referenced course/lesson/question must be theirs too.
create policy "own progress read" on public.lesson_progress for select to authenticated using (owner_id = auth.uid());
create policy "own progress insert" on public.lesson_progress for insert to authenticated with check (
  owner_id = auth.uid()
  and exists (select 1 from public.lessons l where l.id = lesson_id and l.owner_id = auth.uid() and l.course_id = course_id and l.skill_id = skill_id)
);
create policy "own progress update" on public.lesson_progress for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own tutor read" on public.tutor_messages for select to authenticated using (owner_id = auth.uid());
create policy "own tutor insert" on public.tutor_messages for insert to authenticated with check (
  owner_id = auth.uid()
  and exists (select 1 from public.skills s where s.id = skill_id and s.owner_id = auth.uid() and s.course_id = course_id)
);

create policy "own hints read" on public.hint_uses for select to authenticated using (owner_id = auth.uid());
create policy "own hints insert" on public.hint_uses for insert to authenticated with check (
  owner_id = auth.uid()
  and exists (select 1 from public.questions q where q.id = question_id and q.owner_id = auth.uid() and q.course_id = course_id)
);

-- Belt and braces: learners hold no write grants on server-owned tables, and
-- no grants at all on answer keys or idempotency keys.
revoke insert, update, delete on public.courses, public.skills, public.skill_edges, public.skill_mastery,
  public.resources, public.lessons, public.questions, public.assessment_attempts, public.mastery_events,
  public.adaptation_events from anon, authenticated;
revoke all on public.question_keys, public.commit_keys from anon, authenticated;
revoke delete on public.profiles, public.learning_goals, public.lesson_progress, public.tutor_messages,
  public.hint_uses from anon, authenticated;

-- ------------------------------------------------------------------ sf_commit
-- Applies one validated change set atomically: ownership check, optimistic
-- graph-version check and idempotency key, all in one transaction.
create or replace function public.sf_commit(
  p_owner uuid,
  p_course uuid,
  p_expected_version int,
  p_key text,
  p_changes jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course public.courses%rowtype;
  v_table text;
  v_rows jsonb;
  v_cols text;
  v_set text;
  v_pk text;
  allowed text[] := array['skills','skill_edges','skill_mastery','resources','lessons','questions',
                          'question_keys','assessment_attempts','mastery_events','adaptation_events'];
  -- history is append-only: an existing row is never overwritten
  append_only text[] := array['skill_edges','resources','lessons','questions','question_keys',
                              'assessment_attempts','mastery_events','adaptation_events'];
  ordered text[] := array['skills','skill_edges','skill_mastery','resources','lessons','questions',
                          'question_keys','assessment_attempts','mastery_events','adaptation_events'];
begin
  select * into v_course from public.courses where id = p_course for update;
  if not found or v_course.owner_id <> p_owner then
    raise exception 'course not found' using errcode = 'P0002';
  end if;

  if p_key is not null and exists (select 1 from public.commit_keys where owner_id = p_owner and key = p_key) then
    return jsonb_build_object('status', 'duplicate', 'graph_version', v_course.graph_version);
  end if;

  if p_expected_version is not null and v_course.graph_version <> p_expected_version then
    raise exception 'graph version conflict: expected %, found %', p_expected_version, v_course.graph_version
      using errcode = '40001';
  end if;

  for v_table in select jsonb_object_keys(coalesce(p_changes -> 'upsert', '{}'::jsonb)) loop
    if not (v_table = any (allowed)) then
      raise exception 'table % is not writable through sf_commit', v_table;
    end if;
  end loop;

  foreach v_table in array ordered loop
    v_rows := p_changes -> 'upsert' -> v_table;
    continue when v_rows is null or jsonb_array_length(v_rows) = 0;
    if exists (
      select 1 from jsonb_array_elements(v_rows) r
      where (r ->> 'owner_id')::uuid is distinct from p_owner or (r ->> 'course_id')::uuid is distinct from p_course
    ) then
      raise exception 'row ownership mismatch in %', v_table;
    end if;
    v_pk := case v_table when 'skill_mastery' then 'skill_id' when 'question_keys' then 'question_id' else 'id' end;
    select string_agg(quote_ident(column_name), ', ' order by ordinal_position),
           string_agg(format('%1$I = excluded.%1$I', column_name), ', ' order by ordinal_position)
             filter (where column_name not in (v_pk, 'owner_id', 'course_id', 'created_at'))
      into v_cols, v_set
      from information_schema.columns
     where table_schema = 'public' and table_name = v_table;
    if v_table = any (append_only) then
      execute format(
        'insert into public.%1$I (%2$s) select %2$s from jsonb_populate_recordset(null::public.%1$I, $1) on conflict (%3$I) do nothing',
        v_table, v_cols, v_pk) using v_rows;
    else
      execute format(
        'insert into public.%1$I as t (%2$s) select %2$s from jsonb_populate_recordset(null::public.%1$I, $1) '
        'on conflict (%3$I) do update set %4$s where t.course_id = %5$L and t.owner_id = %6$L',
        v_table, v_cols, v_pk, v_set, p_course, p_owner) using v_rows;
    end if;
  end loop;

  update public.courses
     set graph_version = coalesce((p_changes -> 'course' ->> 'graph_version')::int, graph_version),
         state = coalesce(p_changes -> 'course' -> 'state', state),
         status = coalesce(p_changes -> 'course' ->> 'status', status),
         updated_at = now()
   where id = p_course;

  if p_key is not null then
    insert into public.commit_keys (owner_id, key, course_id) values (p_owner, p_key, p_course);
  end if;

  return jsonb_build_object('status', 'applied',
    'graph_version', (select graph_version from public.courses where id = p_course));
end;
$$;

revoke all on function public.sf_commit(uuid, uuid, int, text, jsonb) from public, anon, authenticated;
grant execute on function public.sf_commit(uuid, uuid, int, text, jsonb) to service_role;
