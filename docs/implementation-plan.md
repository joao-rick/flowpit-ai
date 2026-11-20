# FlowPilot AI: implementation plan

## Repository discovery

The workspace initially contained only `codex.md`; no application, package manifest, Git repository, environment configuration, or existing implementation was present. This is a greenfield bootstrap.

## Product framing

- **Primary user:** software engineer or engineering lead triaging incoming development work.
- **Job to be done:** understand the most important issues, see why agents reached a conclusion, and choose what to do next.
- **Success:** a real issue can be imported, analyzed through traceable steps, reviewed, and persisted with access controls.
- **Constraints:** Next.js/Vercel execution limits, private OAuth/model credentials, untrusted issue content, tenant isolation, and no paid resources without explicit authorization.

## Design direction

- Domain vocabulary: issue intake, triage, severity, evidence, agent trace, approval, repository, incident.
- Color world: graphite/blue slate for the engineering workbench, paper white for readable evidence, amber for queued attention, green for completed work, red for failures/incidents.
- Signature: a per-run agent trace that exposes each step's owner, status, evidence, duration, and failure context.
- Reject: identical KPI cards -> task-first operational summary; chat-first surface -> explicit analysis workflow; decorative AI gradients -> semantic status colors and evidence.
- Density: compact workbench controls, spacious analysis focus. One focal action per view; restrained borders, visible keyboard focus, no gratuitous motion.

## Information architecture

- Overview: setup readiness, real operational activity, and a clear first action.
- Analyses: issue selection, analysis scope, trace, result and approval.
- Projects: project settings, repository link, imported issues and history.
- Integrations: GitHub and model provider connection state.
- Settings: profile and workspace configuration.

## Initial UX state contract

| State | Trigger | Response | Next action |
|---|---|---|---|
| Loading | Initial data request | Reserved layout and concise progress | Wait; preserve navigation |
| Empty | No projects or runs | Explain the first setup step; no invented activity | Create a project |
| Recoverable error | An optional data section fails | Keep the rest of the page; show retry | Retry that section |
| Fatal error | App shell cannot load | Explain the failure and offer reload | Reload or contact support |
| Success | Projects/runs exist | Show persisted operational data and latest trace | Open or start analysis |
| Pending/disabled | Required provider/repository missing | Name the missing setup item and disable dependent action | Configure integration |
| Partial | Some integrations/data unavailable | Show available data and clearly label unavailable sections | Reconnect/retry |

## Phases and gates

1. **Discovery and planning:** complete; repository and skills reviewed, product framing and visual direction captured here and in `.interface-design/system.md`.
2. **Foundation:** Next.js App Router, strict TypeScript, semantic design tokens, responsive shell and truthful empty/onboarding state. Gate: lint, typecheck, production build, manual viewport/keyboard review.
3. **Persistence/auth:** Supabase clients, migrations, profile/projects schema and RLS, auth and protected routes. Gate: migration review and tenant-boundary checks.
4. **Core product:** project management, GitHub connection/import, issues, execution history. Gate: integration/service/API coverage.
5. **AI and approvals:** provider abstraction, structured agents, explicit orchestration, trace persistence, human approval. Gate: evaluation fixtures, prompt injection and failure cases.
6. **Production readiness:** observability, docs, deployment configuration, build and deployment verification. Gate: live URL and core workflow validated; credentials/account required.

## Progress at bootstrap checkpoint

- **Phase 1:** repository discovery, skill review, product framing, and design direction documented.
- **Phase 2:** Next.js shell, responsive setup view, design tokens, Supabase SSR clients/proxy, auth forms/actions, project create/list flow, initial SQL schema/RLS, lint/typecheck/build scripts, and unit tests are implemented.
- **Phase 3:** public GitHub repository linking and paginated open issue import are implemented behind authenticated project ownership. Private repositories are not connected.
- **Phase 2 verification:** lint, typecheck, production build, and 44 unit tests across 14 files pass. Local overview/auth/projects/product/history/API routes return expected HTTP 200 or 503-without-Supabase responses. Desktop setup screenshot was reviewed. Mobile setup layout still needs a fresh screenshot after the width correction.
- **Phase 4:** public GitHub issue import is project-bound. The project panel lets a user select imported issues and start an analysis.
- **Phase 5:** structured OpenAI agent steps, source evidence checks, Inngest orchestration, persisted results/traces, and human approval/dismissal are implemented. Decisions now update the approval, execution status, and audit log in one service-only database transaction; external side effects remain disabled.
- **Portfolio/history increment:** project editing and confirmed deletion, project-scoped run history, readable execution traces, and a public `/product` overview are implemented.
- **Knowledge context:** selected issues cache recent public comments; projects accept plain-text documents, split them into source-offset chunks, and retrieve relevant excerpts for a citation-checked Documentation Agent. Each selected issue now receives a separately cited priority assessment, persisted with recommendations scoped to relevant issue IDs. Projects can be archived and restored without losing history; archived projects reject new analyses and repository syncs. Run detail exposes per-step token usage and a model cost estimate only when exact model and token rates are configured.
- **External gate:** no Supabase, GitHub, OpenAI, or Vercel credentials were present. The migrations and authenticated data paths have not been exercised against a live backend.
- **Remaining:** GitHub App authorization for private repositories, PDF/Office document ingestion, semantic retrieval, production price configuration, adversarial prompt-injection evaluation, live database/queue/model validation, deployment, and final screenshot review.

## Current boundary

The source supports local setup preview and the complete code path through issue selection, durable analysis, persisted results, and human review. Live service behavior is unverified until credentials and a Supabase project are available. No paid infrastructure has been provisioned.

