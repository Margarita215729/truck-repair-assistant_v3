# App Store Connect — загрузить сейчас

> **Дата:** 18 июня 2026  
> **Bundle ID:** `com.truckrepairassistant.mobile`  
> **SKU:** TRA-2026-001  
> **Team ID:** `5NNJSQR7UM`

---

## 1. Скриншоты — перетащить в App Store Connect

### iPhone 6.7" (1290×2796) — **обязательно**

Папка: `docs/app-store-screenshots/upload/iphone-6.7/`

| # | Экран | Абсолютный путь |
|---|-------|-----------------|
| 1 | Diagnostics | `/Users/rm/truck-repair-assistant_v3/docs/app-store-screenshots/upload/iphone-6.7/01-diagnostic.png` |
| 2 | Repair Parts | `/Users/rm/truck-repair-assistant_v3/docs/app-store-screenshots/upload/iphone-6.7/02-parts.png` |
| 3 | Service Locator | `/Users/rm/truck-repair-assistant_v3/docs/app-store-screenshots/upload/iphone-6.7/03-locator.png` |
| 4 | Diagnostic Results | `/Users/rm/truck-repair-assistant_v3/docs/app-store-screenshots/upload/iphone-6.7/04-results.png` |

### iPhone 6.5" (1284×2778) — опционально

Папка: `docs/app-store-screenshots/upload/iphone-6.5/`

| # | Файл |
|---|------|
| 1–4 | `01-diagnostic.png` … `04-results.png` (те же экраны) |

> Скриншоты upscaled из симулятора (~550×1024) через `sips`. Качество приемлемо для первой отправки; позже можно переснять на 100% scale.

---

## 2. Иконка приложения

**App Store Connect → App Information → App Icon**

```
/Users/rm/truck-repair-assistant_v3/docs/app-store-screenshots/upload/AppIcon-1024.png
```

- Размер: **1024×1024** PNG  
- Источник: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`

---

## 3. Метаданные — copy-paste

### App Information

| Поле | Значение |
|------|----------|
| **Name** | Truck Repair Assistant |
| **Subtitle** | AI Diagnostics & Repair Guide |
| **Primary Category** | Productivity |
| **Secondary Category** | Business |
| **Content Rights** | Does not contain third-party content |
| **Age Rating** | 4+ |

### URLs

| Поле | URL |
|------|-----|
| **Privacy Policy** | https://www.tra.tools/privacy.html |
| **Terms of Service** | https://www.tra.tools/terms.html |
| **Support URL** | https://www.tra.tools/support.html |
| **Marketing URL** | https://www.tra.tools |

### Keywords (100 символов max)

```
truck,diagnostic,repair,fault,code,parts,mechanic,fleet,dtc,obd,telematics,roadside,breakdown
```

### Promotional Text (170 символов max)

```
🚨 NEW: Real-time telematics alerts for fleet managers! Connect Geotab, Motive, Samsara & more. Get instant fault notifications before breakdowns happen.
```

### Description

```
Get back on the road faster with AI-powered truck diagnostics and repair assistance.

Truck Repair Assistant is the ultimate mobile companion for truck owners, owner-operators, and fleet managers. Whether you're dealing with a dashboard warning light, need repair instructions, or searching for parts, our AI-powered app provides instant, reliable assistance 24/7.

🔧 KEY FEATURES

AI Diagnostic Assistant
• Enter fault codes (DTCs) and get instant AI-powered explanations
• Upload photos of dashboard warnings or parts for visual diagnosis
• Get severity ratings: Critical, High, Medium, or Low
• Understand what's wrong before you call a mechanic

Repair Guidance
• Step-by-step repair instructions for common truck issues
• Curated YouTube video tutorials from trusted mechanics
• Access to forum discussions from experienced drivers
• Safety warnings and best practices for every repair

Parts Finder
• Search OEM and aftermarket parts by make, model, and year
• Compare prices across multiple suppliers
• Direct links to purchase parts online
• Part number lookup and cross-references

Service Locator
• Find nearby repair shops, mobile mechanics, and parts stores
• Location-based search using your current position
• Phone numbers, hours, and directions included
• Filter by service type and distance

Telematics Integration (Fleet Plans)
• Connect to Geotab, Motive, Samsara, Verizon Connect, and Omnitracs
• Real-time fault code alerts pushed to your phone
• Track vehicle health across your entire fleet
• Proactive maintenance scheduling

Repair History Tracking
• Log all repairs and maintenance activities
• Photo documentation of before/after work
• Track costs and warranty information
• Export reports for tax or resale purposes

Offline Access
• Save diagnostic results and repair guides for offline viewing
• Access critical information even without internet
• Perfect for remote areas or job sites

🎯 WHO IS THIS FOR?

• Owner-Operators: Diagnose issues on the road and avoid costly tow bills
• Fleet Managers: Monitor vehicle health and reduce downtime
• Independent Mechanics: Quick reference tool for unfamiliar truck models
• DIY Truck Owners: Save money by understanding repairs before visiting a shop

📊 SUBSCRIPTION PLANS

• Free Plan: Limited diagnostic lookups
• Owner-Operator Plan: Unlimited diagnostics, repair guides, and parts search
• Fleet Plan: All features plus telematics integration and multi-vehicle management

All plans include a free trial. Cancel anytime.

🔒 PRIVACY & SECURITY

Your data is protected with enterprise-grade encryption. We never sell your personal information. Location access is only requested when using the Service Finder feature.

📞 SUPPORT

Need help? Contact us at founder@tra.tools or visit our Help Center in the app.

⚠️ IMPORTANT DISCLAIMER

Truck Repair Assistant provides informational assistance only and is not a substitute for professional mechanical services. Always consult a qualified technician before performing safety-critical repairs. Use at your own risk.
```

### Copyright

```
© 2026 Truck Repair Assistant. All rights reserved.
```

---

## 4. App Review Information

### Contact

| Поле | Значение |
|------|----------|
| First Name | Margarita |
| Last Name | Makeeva |
| Phone | +1 215 252 0163 |
| Email | founder@tra.tools |

### Demo Account (Sign-in required)

| Поле | Значение |
|------|----------|
| **Username** | local.admin@truckassist.app |
| **Password** | [REDACTED] |

### Notes for Reviewer

```
1. AI Diagnostic: Enter any 5-digit fault code (e.g. "P0128") on the Diagnostics screen for instant AI analysis.

2. Location: Service Finder requests location only when tapping "Use My Location". Grant permission to test map search.

3. Guest mode: Diagnostics page works without login — useful for quick testing.

4. Telematics: Third-party provider accounts (Geotab, Motive, etc.) are not available for review. Connection screens are under Settings > Telematics.

5. Payments: Stripe test mode — card 4242 4242 4242 4242, any future expiry, any CVC.

6. Fleet plan is pre-activated on the demo account with sample trucks and diagnostic history.
```

### Age Rating hints

- Unrestricted Web Access: **No**
- Gambling / Contests / Medical: **No**
- Violence / Mature themes: **No**
- **Recommended:** 4+

### Export Compliance

- Uses encryption: **Yes** (HTTPS/TLS only)
- Exempt: **Yes** (standard encryption, no proprietary crypto)

---

## 5. Xcode — Archive & Upload

### Статус сборки (18 июня 2026)

| Шаг | Статус | Детали |
|-----|--------|--------|
| `npm run mobile:prepare` | ✅ Успех | Vite build + cap sync + pod install |
| `xcodebuild archive` | ✅ **ARCHIVE SUCCEEDED** | Team `5NNJSQR7UM`, signing: Apple Development |
| `xcodebuild -exportArchive` | ❌ **EXPORT FAILED** | `App Store Connect Credentials Error` — нужен Apple ID в Xcode |

**Archive path:**
```
/Users/rm/truck-repair-assistant_v3/ios/App/build/App.xcarchive
```

**ExportOptions.plist:**
```
/Users/rm/truck-repair-assistant_v3/ios/App/ExportOptions.plist
```

**Логи:**
- `docs/app-store-screenshots/upload/xcodebuild-archive.log`
- `docs/app-store-screenshots/upload/xcodebuild-export.log`

> Архив подписан **Apple Development** (не Distribution). Xcode при Distribute App переподпишет автоматически для App Store.

### GUI — следующий шаг (требует Apple ID)

1. Открыть Xcode: `npm run cap:open:ios`
2. **Window → Organizer** (или Product → Archive если нужен новый)
3. Выбрать архив **App** от 18 Jun 2026
4. **Distribute App → App Store Connect → Upload**
5. Войти Apple ID (founder@tra.tools / Margarita Makeeva account)
6. В App Store Connect: **TestFlight / App Store → + Version → Select Build**

### CLI (для повторной сборки)

```bash
cd /Users/rm/truck-repair-assistant_v3
npm run mobile:prepare

cd ios/App
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  archive \
  -archivePath build/App.xcarchive \
  -allowProvisioningUpdates
```

---

## 6. Чеклист перед Submit

- [ ] Загрузить 4 скриншота 6.7" из `upload/iphone-6.7/`
- [ ] Загрузить иконку `upload/AppIcon-1024.png`
- [ ] Вставить description, keywords, URLs
- [ ] Заполнить demo account в App Review Information
- [ ] Пройти Privacy Questionnaire (см. `docs/APP_STORE_SUBMISSION.md`)
- [ ] Upload build из Xcode
- [ ] Проверить вход demo-аккаунта перед Submit
- [ ] Submit for Review

---

## 7. Что ещё не готово (не блокирует первую отправку)

| Элемент | Статус |
|---------|--------|
| iPad Pro 12.9" screenshots (2048×2732) | Не подготовлены |
| 5-й скриншот (Repair History) | Опционально |
| App Preview video | Опционально |
| Пересъёмка скриншотов на 100% scale | Улучшит качество позже |

---

**Полная документация:** `docs/APP_STORE_SUBMISSION.md`, `docs/APP_STORE_KEYWORDS.md`
