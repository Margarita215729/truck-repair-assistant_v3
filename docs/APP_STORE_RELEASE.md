# App Store release

Last verified: September 4, 2026.

## Current status

The native iOS shell exists, but the paid App Store release is not ready for
submission.

| Setting | Current value |
| --- | --- |
| Bundle ID | `com.truckrepairassistant.mobile` |
| Marketing version | `1.0.1` |
| Build | `5` |
| Development Team | `5NNJSQR7UM` |
| Production API origin | `https://www.tra.tools` |

Public URLs:

- Privacy: `https://www.tra.tools/privacy.html`
- Terms: `https://www.tra.tools/terms.html`
- Support: `https://www.tra.tools/support.html`

## Blocking work

1. Implement StoreKit/In-App Purchase and verified entitlement restoration.
   Digital features unlocked in an iOS app must follow Apple's current payment
   rules; the existing web Stripe flow is not the iOS purchase implementation.
2. Configure the product in App Store Connect, including the Paid Apps Agreement,
   banking/tax information, subscription metadata, and server notifications.
3. Reconcile Privacy Policy, Terms, App Privacy answers, and review notes with
   the actual shipping data flows and features.
4. Test account creation, guest limits, diagnostics, image upload, reconnect,
   account deletion, and purchase restoration on real iPhone and iPad hardware.
5. Capture fresh screenshots from the final binary. Old repository screenshots
   were removed because they represented an earlier UI, contained duplicate or
   mislabeled files, and did not provide a genuine iPad capture.
6. Create a current Release archive with a valid Apple Distribution identity and
   upload it to App Store Connect.

Apple references:

- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Configure In-App Purchases](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/overview-for-configuring-in-app-purchases/)
- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)

## Local build

```bash
npm ci
npm run validate:env
npm run mobile:prepare
npm run security:scan
npm run cap:open:ios
```

In Xcode, open `ios/App/App.xcworkspace`, use the Release configuration, select a
real device or `Any iOS Device`, and archive through Product → Archive.

Do not overwrite `capacitor.config.ts` for live reload and do not use broad
cleanup commands against all Xcode DerivedData. Keep development overrides
untracked and project-scoped.

## Submission gate

- [ ] StoreKit purchase, restore, expiry, and server synchronization pass in sandbox
- [ ] First In-App Purchase is attached to the app-version submission
- [ ] Paid Apps Agreement, banking, and tax setup are complete
- [ ] Legal pages and App Privacy answers match the binary
- [ ] Fresh iPhone screenshots meet Apple's current accepted dimensions
- [ ] Genuine iPad screenshots exist, or iPad support is intentionally removed
- [ ] Real-device functional and reconnect QA passes
- [ ] Distribution archive validates and uploads successfully
- [ ] Review account and review notes describe only functions present in the binary

App Store metadata and screenshots belong in App Store Connect or a dedicated
release workspace, not as generated artifacts in this source repository.
