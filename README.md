# Truck Repair Assistant

Truck Repair Assistant (TRA) is roadside decision support for owner-operators.
It helps a driver interpret symptoms, dashboard warnings, DTCs, and photos;
understand likely causes; and decide what to do next when a truck develops a
problem on the road.

Production: [www.tra.tools](https://www.tra.tools)

## Current product scope

- Ten text AI requests per day are available without an account.
- Signed-in users can save trucks, conversations, and diagnostic reports.
- Diagnostic input supports text, DTCs, and authenticated image analysis.
- The interface supports English, Spanish, and Russian.
- Parts and nearby-service search are available through server-side APIs.

The following are not production capabilities and must not be marketed as such:

- Paid iOS access: StoreKit/In-App Purchase has not been implemented.
- Web Stripe: legacy routes remain, but checkout currently fails closed and is
  not the iOS purchase implementation.
- Telematics: provider adapters exist, but no operating integration is validated.
- Audio diagnosis: experimental heuristic code, not a validated diagnostic model.
- Offline diagnosis: AI and search features require network access.

## Technology

- React 18 and Vite 6
- Capacitor 7 for iOS and Android shells
- Vercel Functions
- Supabase Auth, Postgres, and Storage
- Gemini for text and image inference
- Google Maps and Brave Search for location and retrieval services

See [Architecture](docs/ARCHITECTURE.md) for the live request paths and feature
status.

## Local development

Requirements: Node.js 20+, npm, and Xcode for iOS work.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Only client-safe values may use `VITE_` or `NEXT_PUBLIC_` prefixes. Server keys
belong in Vercel or another server-side secret manager. Never commit `.env.local`.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run security:scan
```

Before a mobile build:

```bash
npm run validate:env
npm run mobile:prepare
npm run security:scan
```

## Deployment

Pushing `main` creates the production Vercel deployment. Supabase schema changes
must be committed as ordered migrations under `supabase/migrations/` and applied
before code that depends on them is released.

For iOS status and release steps, see [App Store release](docs/APP_STORE_RELEASE.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [App Store release](docs/APP_STORE_RELEASE.md)
- [Credential policy](docs/SECURITY.md)
- [Privacy Policy](PRIVACY_POLICY.md)
- [Terms of Service](TERMS_OF_SERVICE.md)

`PATENT_DISCLOSURE.md` is a dated IP record, not a description of current product
readiness.

## License

Copyright © 2026 Makevia LLC. All rights reserved.

The source code is publicly viewable for portfolio, evaluation, and demonstration
purposes. No open-source license is granted. Copying, modification,
redistribution, or commercial use requires prior written permission from
Makevia LLC.
