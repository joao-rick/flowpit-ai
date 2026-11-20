-- Additive migration for projects that already applied the initial schema.
alter table public.issues add column if not exists comments_synced_at timestamptz;

create table if not exists public.issue_comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  github_comment_id bigint not null,
  author_login text,
  body text not null default '' check (char_length(body) <= 20000),
  source_url text not null,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  imported_at timestamptz not null default now(),
  unique (issue_id, github_comment_id)
);
create index if not exists issue_comments_issue_created_idx on public.issue_comments (issue_id, source_created_at desc);
alter table public.issue_comments enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'issue_comments' and policyname = 'issue_comments_project_owner_read') then
    create policy issue_comments_project_owner_read on public.issue_comments for select to authenticated
      using (exists (
        select 1 from public.issues i
        join public.repositories r on r.id = i.repository_id
        join public.projects p on p.id = r.project_id
        where i.id = issue_comments.issue_id and p.owner_id = (select auth.uid())
      ));
  end if;
end $$;
grant select on public.issue_comments to authenticated;
grant all on public.issue_comments to service_role;

-- Repair owner-scoped policies for databases initialized from earlier schema revisions.
drop policy if exists steps_execution_owner_read on public.agent_steps;
create policy steps_execution_owner_read on public.agent_steps for select to authenticated
  using (exists (select 1 from public.agent_executions e where e.id = agent_steps.execution_id and e.owner_id = (select auth.uid())));
drop policy if exists results_execution_owner_read on public.agent_results;
create policy results_execution_owner_read on public.agent_results for select to authenticated
  using (exists (select 1 from public.agent_executions e where e.id = agent_results.execution_id and e.owner_id = (select auth.uid())));
drop policy if exists approvals_owner_read on public.approval_requests;
create policy approvals_owner_read on public.approval_requests for select to authenticated
  using ((select auth.uid()) = owner_id and exists (
    select 1 from public.agent_executions e where e.id = approval_requests.execution_id and e.owner_id = (select auth.uid())
  ));

create unique index if not exists approval_requests_execution_action_idx on public.approval_requests (execution_id, action_type);

create table if not exists public.agent_issue_assessments (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.agent_executions(id) on delete cascade,
  issue_id uuid not null references public.issues(id) on delete cascade,
  issue_number integer not null check (issue_number > 0),
  priority text not null check (priority in ('critical', 'high', 'medium', 'low')),
  severity text not null,
  impact text not null,
  urgency text not null,
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  reasoning text not null,
  evidence jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (execution_id, issue_id)
);
create index if not exists agent_issue_assessments_priority_idx on public.agent_issue_assessments (priority, created_at desc);
alter table public.agent_issue_assessments enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'agent_issue_assessments' and policyname = 'issue_assessments_execution_owner_read') then
    create policy issue_assessments_execution_owner_read on public.agent_issue_assessments for select to authenticated
      using (exists (select 1 from public.agent_executions e where e.id = agent_issue_assessments.execution_id and e.owner_id = (select auth.uid())));
  end if;
end $$;
grant select on public.agent_issue_assessments to authenticated;
grant all on public.agent_issue_assessments to service_role;

create or replace function public.decide_analysis(
  p_execution_id uuid,
  p_owner_id uuid,
  p_decision text,
  p_note text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  resulting_status public.execution_status;
  resulting_approval_status public.approval_status;
  project_id uuid;
  changed_approval_id uuid;
begin
  if p_decision is null or p_decision not in ('approve', 'reject') then
    raise exception 'invalid_decision';
  end if;
  if char_length(coalesce(p_note, '')) > 500 then
    raise exception 'decision_note_too_long';
  end if;

  resulting_status := case when p_decision = 'approve' then 'completed'::public.execution_status else 'cancelled'::public.execution_status end;
  resulting_approval_status := case when p_decision = 'approve' then 'approved'::public.approval_status else 'rejected'::public.approval_status end;

  update public.agent_executions e
  set status = resulting_status, finished_at = now()
  where e.id = p_execution_id and e.owner_id = p_owner_id and e.status = 'needs_review'
  returning e.project_id into project_id;
  if not found then
    return null;
  end if;

  update public.approval_requests a
  set status = resulting_approval_status, decision_note = coalesce(p_note, ''), decided_at = now()
  where a.execution_id = p_execution_id and a.owner_id = p_owner_id
    and a.action_type = 'review_recommendations' and a.status = 'pending'
  returning a.id into changed_approval_id;
  if not found then
    raise exception 'approval_not_pending';
  end if;

  insert into public.activity_logs (owner_id, project_id, execution_id, actor_type, actor_id, action, details)
  values (p_owner_id, project_id, p_execution_id, 'user', p_owner_id::text,
    case when p_decision = 'approve' then 'analysis.approved' else 'analysis.rejected' end,
    jsonb_build_object('note', coalesce(p_note, '')));

  return resulting_status::text;
end;
$$;
revoke all on function public.decide_analysis(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.decide_analysis(uuid, uuid, text, text) to service_role;
