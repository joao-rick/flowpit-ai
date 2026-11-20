# Deployment

## Current status

The application is not deployed. No Supabase, GitHub OAuth, OpenAI, Inngest, or Vercel credentials were present during the initial repository inspection. Live auth, queue, and model behavior have not been verified.

## Intended Vercel setup

1. Configure the repository and production branch in Vercel.
2. Set Supabase URL/publishable/secret keys, `OPENAI_API_KEY` and optional `OPENAI_MODEL`, plus Inngest event/signing keys; keep service keys server-only. Estimated model costs are opt-in: configure the exact `OPENAI_PRICING_MODEL` plus input/output USD-per-million-token rates, and configure cached-input pricing if calls report cached tokens. Rates must reflect the model and context tier used; leaving them empty disables estimates. The Inngest route caps each Vercel invocation at 300 seconds and Inngest checkpointing yields by 240 seconds to leave runtime headroom.
3. Configure Supabase redirect/callback URLs and apply reviewed migrations.
4. The current public repository path needs no GitHub credentials. For a later private-repository release, register a GitHub App with read-only issue/metadata permissions and an installation callback.
5. Run lint, typecheck, build, and production smoke checks.
6. Verify the deployed URL, login, tenant isolation, project persistence, GitHub import, Inngest delivery, review decisions, and a real AI analysis before calling the release complete.

No paid resources or recurring services should be created without explicit authorization.
