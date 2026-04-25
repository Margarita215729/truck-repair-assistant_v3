# App Store Readiness Guide

This project is prepared for native packaging via Capacitor.

## What is already added

- Capacitor configuration: `capacitor.config.ts`
- PWA manifest: `public/manifest.webmanifest`
- Service worker for app shell caching: `public/sw.js`
- Service worker bootstrap: `src/registerServiceWorker.js`
- HTML mobile metadata: `index.html`
- Mobile scripts in `package.json` (`mobile:prepare`, `cap:sync`, `cap:open:*`)

## Prerequisites

1. Install Node.js (LTS 20+ recommended) and npm.
2. Install Xcode (for iOS) and accept command line tools.
3. Install Android Studio (for Android) and SDK platform tools.

## Install dependencies

```bash
npm install
```

## Native project bootstrap

```bash
npx cap add ios
npx cap add android
npm run mobile:prepare
```

## Daily sync workflow

```bash
npm run build:mobile
npm run cap:sync
```

## Open native projects

```bash
npm run cap:open:ios
npm run cap:open:android
```

## App Store / Play Store checklist

1. Replace app identifiers and names in `capacitor.config.ts` with production values.
2. Add production app icons and launch screens in iOS/Android native projects.
3. Set production API URLs and secrets using secure runtime configuration.
4. Configure legal URLs in app metadata (Privacy Policy URL and Terms of Use URL).
5. Add App Tracking Transparency prompt logic on iOS if tracking/ads are used.
6. Validate offline and reconnect behavior (service worker + API retries).
7. Run release QA on real devices (not only simulator/emulator).
8. Build signed release binaries (iOS: archive in Xcode and upload to App Store Connect; Android: signed AAB for Google Play Console).

## Suggested next enhancements before submission

- Add dedicated offline fallback page and retry UX.
- Add runtime network status indicators.
- Add native deep links and universal links.
- Add crash analytics and release monitoring.
