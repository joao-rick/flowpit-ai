# Orchestration

## Execution state machine

`queued → running → needs_review → completed`

Any active state can transition to `failed` or `cancelled`. Each run records its requested scope, project, workflow version, timestamps, and terminal reason. Each step records a stable ID, agent, input reference, status, output, duration, retry count, and sanitized error.

## Default workflow

Validate request and permissions → load authorized issues/comments → analyze issue → retrieve relevant project document chunks → classify priority → draft recommendations → consolidate report → persist results → request human review.

Steps with no relevant documentation should be marked `skipped` with a reason, not fabricated. Retries must be bounded and idempotent. External mutations are excluded until a separate approval record authorizes one specific action.

## Status

Analysis requests persist an execution and six trace steps (comment context, issue analyst, documentation, priority, recommendations, report) before emitting `flowpilot/analysis.requested` to Inngest. The function loads the persisted issue IDs, refreshes or reuses up to 20 public comments per issue, retrieves up to four relevant indexed document chunks, then runs specialist steps durably and records output/model/token/duration metadata. Priority is computed once per selected issue, and recommendations carry issue IDs so the persisted assessment records show which proposals apply to each issue. It creates a pending review request and moves the execution to `needs_review`. The user can approve the analysis or dismiss it through a service-only Postgres function that atomically updates the approval record, execution status, and audit event; neither action mutates GitHub. Supabase RLS checks project ownership before the server-side worker is queued. `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are needed outside local Inngest development.
