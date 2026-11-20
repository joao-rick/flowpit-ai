# Database model

## Entities

- `profiles`: auth user metadata.
- `projects`: owner/workspace scoped configuration with reversible `archived_at` lifecycle state.
- `github_integrations`: encrypted provider credentials and installation/account metadata.
- `repositories`: linked repository identity and sync cursor.
- `issues`: normalized source content, labels, author, timestamps, and source URL.
- `issue_comments`: bounded public comments linked to imported issues and readable only by the project owner.
- `agent_executions`: user request, scope, status, workflow version, usage and timing; user history pages read through RLS.
- `agent_steps`: ordered, traceable step inputs/outputs/status/errors.
- `agent_results`: run-level synthesis, aggregate priority, citations, and recommendations.
- `agent_issue_assessments`: one validated priority assessment per selected issue, with issue-specific citations and scoped recommendations.
- `documents` / `document_chunks`: project documents and optional retrieval embeddings.
- `approval_requests`: proposed external action, decision, actor, and timestamps.
- `activity_logs`: append oriented audit events.

## Invariants

Use UUID primary keys, UTC timestamps, foreign keys, uniqueness for provider IDs within a project/repository, indexes for owner/status/time queries, and RLS based on authenticated ownership. Secrets must not be stored in plaintext tables or returned by browser queries.

## Migration status

The initial schema and RLS policies are in `supabase/migrations/20261116000000_initial_schema.sql`. The additive `20261116010000_comments_and_knowledge.sql` supports environments that already applied an earlier initial schema and adds comment storage, per-issue assessments, the approval idempotency index, owner-policy repairs, and a service-only `decide_analysis` function that atomically commits the review decision and audit event. Apply migrations in order with the Supabase CLI or SQL editor. No schema is deployed yet because no project credentials were available.
