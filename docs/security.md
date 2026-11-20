# Security model

## Planned controls

- Supabase Auth session required for user-owned project, issue, execution, and approval routes.
- Row Level Security on every tenant-owned table; service-role access restricted to server-only code.
- OAuth and model secrets are server-only, encrypted at rest where persisted, and never logged.
- GitHub scopes limited to required repository read access initially.
- Webhook signatures and OAuth state/PKCE validation for callback flows.
- Zod validation, rate limits, bounded payload sizes, and idempotency for mutations.
- Treat issues, comments, and retrieved documents as untrusted prompt content; tool permissions come from server policy, never model output.
- Every external write requires explicit approval bound to an exact action and target.

## Implemented and pending

Implemented: Supabase SSR cookie clients, signed claim checks in the Next.js 16 proxy and server pages/actions, Zod validation on auth/project/repository/analysis/document inputs, owner-derived writes, RLS on the initial schema, read-only user access to imported issues/comments/documents, project archive/restore actions and guards preventing new analysis/sync requests for archived projects, and server-only Supabase secret clients for sync/orchestration writes. Public GitHub data uses fixed `api.github.com` paths; repository URLs are constrained to GitHub paths. Model outputs are schema-validated and issue/comment/document evidence quotes are checked against sources. Document uploads are capped at 200 KB and split into bounded chunks. Analysis proposes recommendations; review decisions are applied by a service-only security-definer function that checks execution ownership and atomically updates both approval and execution state with its audit record; review does not authorize GitHub side effects. Private repository OAuth, global abuse rate limits, and approval-backed GitHub writes remain unimplemented. The migration has not been applied live.
