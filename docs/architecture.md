# Architecture

## Status

The code is a Next.js App Router application with Supabase Auth/project persistence and a public GitHub issue adapter. The MVP is a modular monolith deployed to Vercel, with Inngest for durable analysis jobs and Supabase for auth and PostgreSQL.

## Target request path

Browser → authenticated Route Handler → Zod request validation → domain service → Supabase/GitHub/AI adapter → persisted result. React components should not own business rules, credentials, provider calls, or orchestration.

## Runtime boundaries

Keep short reads and mutations in Route Handlers/Server Actions. Analysis persists a queued execution and dispatches an Inngest event; the worker loads issue comments and relevant project document chunks, runs five structured model steps, and writes trace/results. The GitHub importer bounds a call to one 100-issue page and a 10-second upstream timeout.

## Planned modules

- `src/app`: routes and layouts.
- `src/lib/auth`: session and authorization helpers.
- `src/lib/db`: Supabase clients and repositories.
- `src/lib/github`: public repository validation and REST issue adapter.
- `src/lib/ai`: provider interface and model adapters.
- `src/lib/agents`: schemas and specialist prompts.
- `src/lib/orchestration`: durable workflow and state transitions.
- `src/lib/services`: use cases independent of UI.
- `supabase/migrations`: schema and RLS policies.

## Integration limits

The current GitHub path accepts one public repository per project and reads open issues from unauthenticated REST endpoints, up to 100 issues per page with at most 10 pages. Selected issues can refresh and cache up to 20 public comments each. GitHub's unauthenticated rate limit applies. Private repository access requires a read-only GitHub App flow and is not implemented.
