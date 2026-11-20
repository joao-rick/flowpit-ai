create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

create type public.execution_status as enum (
  'queued', 'running', 'needs_review', 'completed', 'failed', 'cancelled'
);

create type public.step_status as enum (
  'pending', 'running', 'completed', 'failed', 'skipped'
);

create type public.approval_status as enum ('pending', 'approved', 'rejected');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  settings jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.github_integrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  account_login text not null,
  account_id bigint not null,
  granted_scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, account_id)
);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table private.github_credentials (
  integration_id uuid primary key references public.github_integrations(id) on delete cascade,
  encrypted_access_token text not null,
  encrypted_refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
revoke all on private.github_credentials from public, anon, authenticated;
grant all on private.github_credentials to service_role;

create table public.repositories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid references public.github_integrations(id) on delete set null,
  github_repository_id bigint not null,
  full_name text not null,
  default_branch text,
  sync_cursor timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.repositories(id) on delete cascade,
  github_issue_id bigint not null,
  issue_number integer not null check (issue_number > 0),
  title text not null check (char_length(title) between 1 and 500),
  body text not null default '',
  state text not null check (state in ('open', 'closed')),
  author_login text,
  labels jsonb not null default '[]'::jsonb,
  source_url text not null,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  imported_at timestamptz not null default now(),
  comments_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (repository_id, github_issue_id),
  unique (repository_id, issue_number)
);

create table public.issue_comments (
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

create table public.agent_executions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  request_text text not null check (char_length(request_text) between 1 and 4000),
  status public.execution_status not null default 'queued',
  workflow_version text not null,
  issue_ids uuid[] not null default '{}',
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms bigint check (duration_ms is null or duration_ms >= 0),
  model_usage jsonb not null default '{}'::jsonb,
  estimated_cost_usd numeric(12, 6),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agent_steps (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.agent_executions(id) on delete cascade,
  step_key text not null,
  agent_name text not null,
  sequence integer not null check (sequence > 0),
  status public.step_status not null default 'pending',
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  evidence jsonb not null default '[]'::jsonb,
  model_name text,
  prompt_version text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms bigint check (duration_ms is null or duration_ms >= 0),
  retry_count integer not null default 0 check (retry_count >= 0),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  unique (execution_id, step_key),
  unique (execution_id, sequence)
);

create table public.agent_results (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null unique references public.agent_executions(id) on delete cascade,
  summary text not null,
  priority text check (priority in ('critical', 'high', 'medium', 'low')),
  severity text,
  impact text,
  urgency text,
  confidence numeric(4, 3) check (confidence is null or confidence between 0 and 1),
  reasoning text,
  evidence jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.agent_issue_assessments (
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

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_name text not null,
  content_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'indexed', 'failed')),
  created_at timestamptz not null default now(),
  unique (project_id, content_hash)
);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null,
  source_location jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  execution_id uuid not null references public.agent_executions(id) on delete cascade,
  action_type text not null,
  target jsonb not null,
  proposed_payload jsonb not null,
  status public.approval_status not null default 'pending',
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index approval_requests_execution_action_idx on public.approval_requests (execution_id, action_type);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  execution_id uuid references public.agent_executions(id) on delete set null,
  actor_type text not null check (actor_type in ('user', 'system', 'agent')),
  actor_id text,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index projects_owner_created_idx on public.projects (owner_id, created_at desc);
create index repositories_owner_project_idx on public.repositories (owner_id, project_id);
create index issues_repository_state_idx on public.issues (repository_id, state, source_updated_at desc);
create index issue_comments_issue_created_idx on public.issue_comments (issue_id, source_created_at desc);
create index executions_owner_created_idx on public.agent_executions (owner_id, created_at desc);
create index executions_project_status_idx on public.agent_executions (project_id, status, created_at desc);
create index agent_steps_execution_sequence_idx on public.agent_steps (execution_id, sequence);
create index agent_issue_assessments_priority_idx on public.agent_issue_assessments (priority, created_at desc);
create index documents_project_idx on public.documents (project_id, created_at desc);
create index approvals_owner_status_idx on public.approval_requests (owner_id, status, created_at desc);
create index activity_owner_created_idx on public.activity_logs (owner_id, created_at desc);

create function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger github_integrations_updated_at before update on public.github_integrations for each row execute function public.set_updated_at();
create trigger repositories_updated_at before update on public.repositories for each row execute function public.set_updated_at();
create trigger issues_updated_at before update on public.issues for each row execute function public.set_updated_at();
create trigger executions_updated_at before update on public.agent_executions for each row execute function public.set_updated_at();
create trigger approvals_updated_at before update on public.approval_requests for each row execute function public.set_updated_at();

create function public.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_auth_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.github_integrations enable row level security;
alter table public.repositories enable row level security;
alter table public.issues enable row level security;
alter table public.issue_comments enable row level security;
alter table public.agent_executions enable row level security;
alter table public.agent_steps enable row level security;
alter table public.agent_results enable row level security;
alter table public.agent_issue_assessments enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.approval_requests enable row level security;
alter table public.activity_logs enable row level security;

create policy profiles_self_read on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy profiles_self_update on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy projects_owner_all on public.projects for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy github_integrations_owner_read on public.github_integrations for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy repositories_owner_read on public.repositories for select to authenticated
  using ((select auth.uid()) = owner_id and exists (
    select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())
  ));
create policy repositories_owner_insert on public.repositories for insert to authenticated
  with check ((select auth.uid()) = owner_id and exists (
    select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())
  ) and (integration_id is null or exists (
    select 1 from public.github_integrations i where i.id = integration_id and i.owner_id = (select auth.uid())
  )));
create policy repositories_owner_update on public.repositories for update to authenticated
  using ((select auth.uid()) = owner_id and exists (
    select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())
  )) with check ((select auth.uid()) = owner_id and exists (
    select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())
  ) and (integration_id is null or exists (
    select 1 from public.github_integrations i where i.id = integration_id and i.owner_id = (select auth.uid())
  )));
create policy repositories_owner_delete on public.repositories for delete to authenticated
  using ((select auth.uid()) = owner_id and exists (
    select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())
  ));
create policy issues_project_owner_read on public.issues for select to authenticated
  using (exists (
    select 1 from public.repositories r join public.projects p on p.id = r.project_id
    where r.id = repository_id and p.owner_id = (select auth.uid())
  ));
create policy issue_comments_project_owner_read on public.issue_comments for select to authenticated
  using (exists (
    select 1 from public.issues i
    join public.repositories r on r.id = i.repository_id
    join public.projects p on p.id = r.project_id
    where i.id = public.issue_comments.issue_id and p.owner_id = (select auth.uid())
  ));
create policy executions_owner_read on public.agent_executions for select to authenticated
  using ((select auth.uid()) = owner_id and exists (
    select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())
  ));
create policy steps_execution_owner_read on public.agent_steps for select to authenticated
  using (exists (select 1 from public.agent_executions e where e.id = agent_steps.execution_id and e.owner_id = (select auth.uid())));
create policy results_execution_owner_read on public.agent_results for select to authenticated
  using (exists (select 1 from public.agent_executions e where e.id = agent_results.execution_id and e.owner_id = (select auth.uid())));
create policy issue_assessments_execution_owner_read on public.agent_issue_assessments for select to authenticated
  using (exists (select 1 from public.agent_executions e where e.id = agent_issue_assessments.execution_id and e.owner_id = (select auth.uid())));
create policy documents_owner_read on public.documents for select to authenticated
  using ((select auth.uid()) = owner_id and exists (
    select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())
  ));
create policy chunks_document_owner_read on public.document_chunks for select to authenticated
  using (exists (select 1 from public.documents d where d.id = document_id and d.owner_id = (select auth.uid())))
;
create policy approvals_owner_read on public.approval_requests for select to authenticated
  using ((select auth.uid()) = owner_id and exists (
    select 1 from public.agent_executions e where e.id = approval_requests.execution_id and e.owner_id = (select auth.uid())
  ));
create policy activity_owner_read on public.activity_logs for select to authenticated
  using ((select auth.uid()) = owner_id);

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.projects, public.repositories to authenticated;
grant select on public.github_integrations, public.repositories, public.issues,
  public.agent_executions, public.agent_steps, public.agent_results, public.documents,
  public.agent_issue_assessments, public.document_chunks, public.approval_requests, public.activity_logs to authenticated;
grant all on public.github_integrations, public.repositories, public.issues,
  public.agent_executions, public.agent_steps, public.agent_results, public.agent_issue_assessments, public.documents,
  public.document_chunks, public.approval_requests, public.activity_logs to service_role;
grant select on public.issue_comments to authenticated;
grant all on public.issue_comments to service_role;

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
