# FlowPilot AI

FlowPilot AI is an engineering workbench for triaging software delivery requests with traceable, human-reviewed AI workflows.

> **Project status:** the MVP workflow is implemented locally. Supabase auth and projects, public GitHub issue import, structured AI analysis, Inngest orchestration, persisted agent traces, and human review are wired. External credentials are required for live analysis; production deployment and live backend validation remain outstanding.

## The problem

Engineering teams receive issues, bug reports, feature requests, and technical work from many sources. FlowPilot is designed to gather that work, make priorities explainable with evidence, and let people review recommendations before acting on them.

## Product principles

- Explicit workflows with visible agent ownership and step status.
- Evidence and source context attached to recommendations.
- Human approval before any external write.
- Tenant scoped persistence and server only credentials.
- No fabricated activity or cost estimates.

## Current foundation

- Responsive Next.js App Router workspace shell.
- Product specific visual tokens and setup onboarding.
- Supabase SSR authentication: sign up, sign in, sign out, email confirmation, and password recovery.
- Project creation/listing through authenticated server actions and owner scoped database policies.
- Project editing and confirmed deletion, plus project-scoped execution history and trace detail pages.
- Public GitHub repository linking and paginated open issue import through GitHub's REST API.
- Up to 20 recent public issue comments are cached for six hours and included as verifiable analysis evidence.
- Five structured specialist steps with per-issue priority records, issue-scoped recommendations, issue/comment/document quote verification, and a human review gate.
- Plain-text project document indexing, lexical retrieval, and a documentation specialist with chunk citations.
- Durable Inngest jobs with persisted step status, model metadata, token usage, and results.
- Public product overview at `/product` describing the current workflow and its boundaries.
- Dashboard metrics, recent analyses, and audit events are queried from Supabase when the schema is available.
- Honest empty states for integrations and analyses; no demo records presented as real work.
- Keyboard focus treatment and reduced motion support.
- Explicit setup progress; no demo records presented as real work.

## Remaining capabilities

- Replacing or managing linked repositories in place.
- GitHub App access for private repositories.
- PDF/Office document ingestion, semantic/vector retrieval, and model cost estimation.
- Live migration/auth/queue/model validation and production deployment.

## Architecture

The application uses Next.js Route Handlers and server services. AI calls use the OpenAI Node SDK with structured Zod schemas; Inngest runs long analyses as durable steps. Issue content is untrusted, evidence quotes are matched to imported text, and recommendations require human review. Review decisions are committed atomically with the audit event through a service-only Postgres function. Review does not perform GitHub writes.

See [docs/implementation-plan.md](docs/implementation-plan.md) and the technical documents in `docs/` as the implementation progresses.

## Getting started

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase environment values, the workspace stays in setup preview and writes remain disabled. Configure Supabase and apply the SQL migrations in `supabase/migrations/` in timestamp order. Public issue imports require the server-only Supabase secret key. Analysis also requires `OPENAI_API_KEY`, optional `OPENAI_MODEL`, optional model pricing (`OPENAI_PRICING_MODEL` and per-million input/output rates) if you want cost estimates, and Inngest event/signing keys; run `npx inngest-cli@latest dev` alongside Next.js for local queue development.

## Environment

Copy `.env.example` to `.env.local` and set values for services you configure. Never place service credentials in client accessible variables such as `NEXT_PUBLIC_*`.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Screenshots and demo

The `/product` page describes the workflow without presenting mock data as a real execution. Screenshots and a hosted demo remain outstanding pending a visually verified setup and a validated deployment.

## Known limitations

- Auth and database behavior have not been verified against a live Supabase project because credentials were not available during implementation.
- GitHub access currently supports public repositories only, in pages of up to 100 issues. Private repository access is not implemented.
- Public GitHub linking currently supports one repository per project and cannot be changed in place.
- Comment context is limited to the newest 20 comments per issue; unauthenticated GitHub API rate limits apply.
- Project documents are plain text up to 200 KB each; retrieval currently uses lexical matching and selects at most four chunks.
- Live AI analysis requires configured OpenAI and Inngest credentials; those services were not available for an end-to-end run.
- Model and token usage is retained per run. Estimated cost uses configured per-million input/output rates and, when applicable, cached-token rates; missing or mismatched pricing/token data leaves the estimate unavailable.
- No production deployment has been performed.
