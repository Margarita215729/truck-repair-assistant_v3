# Credential policy

Last verified: September 4, 2026.

Do not commit passwords, API keys, or other credentials to this repository.
Store server credentials only in secure secret managers such as Supabase Dashboard
and Vercel Environment Variables.

## Supabase variables

Only these Supabase variables are supported:

| Scope | Variable | Expected value |
| --- | --- | --- |
| Browser/mobile | `NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL` | Project HTTPS URL |
| Browser/mobile | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_*` |
| Vercel/server | `STORAGE_SUPABASE_SUPABASE_SECRET_KEY` | `sb_secret_*` |

Anything under `VITE_` or `NEXT_PUBLIC_` is public and may be embedded in web,
iOS, and Android bundles. Never use those prefixes for secrets, service-role
keys, JWT secrets, database credentials, GitHub tokens, Gemini keys, or Stripe
secret keys.

Gemini is the active inference provider. GitHub Models is retired and the
application must not require a GitHub personal access token. Infrastructure data
ingest is disabled unless `INGEST_ENABLED=true`; re-enabling it requires a newly
rotated server-only `INGEST_API_KEY`.

Legacy Supabase anon JWTs, service-role JWTs, JWT secrets, Postgres connection
variables, and alternative Supabase aliases are prohibited. They are not client
fallbacks and should be removed after their replacements are deployed.

## Required checks

Run the environment validator before a build and the bundle audit afterward:

```bash
npm run validate:env
npm run mobile:prepare
npm run security:scan
```

The validator rejects unsupported Supabase names and secret-like values configured
under client-visible prefixes. The bundle audit checks generated web, iOS, and
Android assets. A clean build and scan are required before App Store submission.

If a credential ever appears in a generated bundle or repository history, treat
it as compromised: rotate or revoke it at the provider, update the server
environment, rebuild all client assets, and rerun the audit.
