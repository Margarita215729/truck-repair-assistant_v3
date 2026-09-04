# Current architecture

Last verified: September 4, 2026.

This file describes the deployed system. Historical implementation reports live
in Git history and are intentionally not kept as parallel documentation.

## Runtime topology

1. The React/Vite application runs in a browser or a Capacitor native shell.
2. Supabase provides authentication, Postgres data, row-level security, and
   temporary media storage.
3. Vercel Functions protect server credentials and call Gemini, Google Maps,
   Brave Search, Stripe, and optional telematics providers.
4. `www.tra.tools` is the canonical web and mobile API origin.

## AI request paths

### Guest text

`Diagnostics` creates a stable pseudonymous guest identifier and sends it in
`X-TRA-Guest-ID` to `/api/ai-proxy`. The server HMACs the identifier and network
address, atomically reserves the daily quota in Supabase, and then calls Gemini.
The current quota is ten successful requests per UTC day. Provider failures
release the reservation.

### Signed-in text

The same endpoint validates the Supabase bearer token and applies the registered
user quota before calling Gemini.

### Images

Authenticated image analysis uses temporary private storage and
`/api/gemini-proxy`. Guest image analysis is not enabled.

## Feature status

| Area | Status |
| --- | --- |
| Guest text diagnostics | Production |
| Auth, truck profiles, conversations, reports | Production |
| Text/DTC/image inference | Production, network required |
| Parts and service retrieval | Production APIs; some paths require auth |
| Infrastructure data ingest | Disabled by default; requires both `INGEST_ENABLED=true` and a rotated key |
| Web Stripe checkout | Legacy routes deployed; checkout currently fails closed and is not the iOS monetization path |
| App Store In-App Purchase | Not implemented |
| Telematics providers | Adapter code only; not validated as an operating service |
| Audio diagnosis | Experimental heuristic only |

## Source map

- `src/pages/` — application routes
- `src/services/` — client-side orchestration
- `api/` — server-only HTTP functions
- `supabase/migrations/` — ordered database history; never delete old migrations
- `ios/` and `android/` — Capacitor native projects
- `public/` — deployed static files, including legal and support pages

## Change discipline

- Code is the source of truth for behavior; this file records only durable
  architecture and explicit feature status.
- Do not add feature-completion reports or generated build logs to the repository.
- Update this file in the same commit when a status in the table changes.
- Put secrets only in server-side environment storage and follow
  [SECURITY.md](SECURITY.md).
