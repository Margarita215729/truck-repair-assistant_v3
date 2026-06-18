# App Store Submission Guide

This document contains all necessary information and metadata for submitting Truck Repair Assistant to the Apple App Store and Google Play Store.

---

## 📱 App Store Metadata

### App Information

**App Name**: Truck Repair Assistant  
**Subtitle**: AI-Powered Truck Diagnostics & Repair  
**Bundle ID**: com.truckrepairassistant.mobile  
**SKU**: TRA-2026-001  
**Primary Category**: Productivity  
**Secondary Category**: Business  
**Content Rating**: 4+ (suitable for all ages)

---

## 📝 App Description

### Short Description (80 characters max)
AI-powered diagnostics, repair guides, and parts search for truck owners & fleets

### Full Description

**Get back on the road faster with AI-powered truck diagnostics and repair assistance.**

Truck Repair Assistant is the ultimate mobile companion for truck owners, owner-operators, and fleet managers. Whether you're dealing with a dashboard warning light, need repair instructions, or searching for parts, our AI-powered app provides instant, reliable assistance 24/7.

**🔧 KEY FEATURES**

**AI Diagnostic Assistant**
• Enter fault codes (DTCs) and get instant AI-powered explanations
• Upload photos of dashboard warnings or parts for visual diagnosis
• Get severity ratings: Critical, High, Medium, or Low
• Understand what's wrong before you call a mechanic

**Repair Guidance**
• Step-by-step repair instructions for common truck issues
• Curated YouTube video tutorials from trusted mechanics
• Access to forum discussions from experienced drivers
• Safety warnings and best practices for every repair

**Parts Finder**
• Search OEM and aftermarket parts by make, model, and year
• Compare prices across multiple suppliers
• Direct links to purchase parts online
• Part number lookup and cross-references

**Service Locator**
• Find nearby repair shops, mobile mechanics, and parts stores
• Location-based search using your current position
• Phone numbers, hours, and directions included
• Filter by service type and distance

**Telematics Integration** (Fleet Plans)
• Connect to Geotab, Motive, Samsara, Verizon Connect, and Omnitracs
• Real-time fault code alerts pushed to your phone
• Track vehicle health across your entire fleet
• Proactive maintenance scheduling

**Repair History Tracking**
• Log all repairs and maintenance activities
• Photo documentation of before/after work
• Track costs and warranty information
• Export reports for tax or resale purposes

**Offline Access**
• Save diagnostic results and repair guides for offline viewing
• Access critical information even without internet
• Perfect for remote areas or job sites

**🎯 WHO IS THIS FOR?**

• **Owner-Operators**: Diagnose issues on the road and avoid costly tow bills
• **Fleet Managers**: Monitor vehicle health and reduce downtime
• **Independent Mechanics**: Quick reference tool for unfamiliar truck models
• **DIY Truck Owners**: Save money by understanding repairs before visiting a shop

**💡 WHY CHOOSE TRUCK REPAIR ASSISTANT?**

✓ **Save Money**: Understand issues before paying for diagnostics  
✓ **Save Time**: Get instant answers instead of searching forums  
✓ **Stay Safe**: Know when it's critical vs. when you can wait  
✓ **Make Informed Decisions**: Talk to mechanics with confidence  
✓ **Available 24/7**: Help whenever you need it, wherever you are  

**📊 SUBSCRIPTION PLANS**

• **Free Plan**: Limited diagnostic lookups
• **Owner-Operator Plan**: Unlimited diagnostics, repair guides, and parts search
• **Fleet Plan**: All features plus telematics integration and multi-vehicle management

All plans include a free trial. Cancel anytime.

**🔒 PRIVACY & SECURITY**

Your data is protected with enterprise-grade encryption. We never sell your personal information. Location access is only requested when using the Service Finder feature.

**📞 SUPPORT**

Need help? Contact us at founder@tra.tools or visit our Help Center in the app.

**⚠️ IMPORTANT DISCLAIMER**

Truck Repair Assistant provides informational assistance only and is not a substitute for professional mechanical services. Always consult a qualified technician before performing safety-critical repairs. Use at your own risk.

---

## 🖼️ Screenshots & Marketing Assets

### Required Screenshots

**iPhone 6.7" (iPhone 15 Pro Max)**
1. Main diagnostic screen with fault code analysis
2. AI chat interface showing repair guidance
3. Parts search results with pricing
4. Service locator map view
5. Repair history timeline

**iPhone 6.5" (iPhone 14 Plus)**
Same 5 screenshots optimized for this size

**iPad Pro (12.9" - 3rd gen)**
Same 5 screenshots optimized for tablet layout

### App Preview Video (Optional)
- 15-30 second demo showing:
  1. Entering a fault code
  2. Receiving AI diagnosis
  3. Viewing repair steps
  4. Finding nearby services

### App Icon
- 1024×1024 px PNG without transparency
- Should include truck/wrench iconography
- Use brand colors (orange/black)
- **Source of truth (SVG):** `LOGO_TRA_v1.svg` in repo root
- **Upload-ready PNG:** `docs/app-store-screenshots/upload/AppIcon-1024.png`
- **Folder guide:** `docs/app-store-screenshots/README.md`

> `public/logo.svg` is the web app copy — do **not** use it for App Store icon generation.

### Screenshots (prepared in repo)

All assets live under **`docs/app-store-screenshots/`** — see [`README.md`](app-store-screenshots/README.md).

| Layer | Path | Size | Use |
|-------|------|------|-----|
| Originals | `docs/app-store-screenshots/01–04-*.png` | ~550×1024 | Simulator captures (50% scale) |
| **Upload iPhone 6.7"** | `docs/app-store-screenshots/upload/iphone-6.7/*.png` | **1290×2796** | **Drag into App Store Connect** |
| Upload iPhone 6.5" | `docs/app-store-screenshots/upload/iphone-6.5/*.png` | 1284×2778 | Optional second size set |

| File | Screen |
|------|--------|
| `01-diagnostic.png` | Main diagnostics |
| `02-parts.png` | Repair Parts |
| `03-locator.png` | Service Locator |
| `04-results.png` | Diagnostic results / chat |

**Regenerate upload sizes (macOS):**
```bash
cd docs/app-store-screenshots
mkdir -p upload/iphone-6.7 upload/iphone-6.5
for f in 0*.png; do
  sips -z 2796 1290 "$f" --out "upload/iphone-6.7/$f"
  sips -z 2778 1284 "$f" --out "upload/iphone-6.5/$f"
done
```

Still missing (not blocking first submit): iPad Pro 12.9" (2048×2732).

---

## 🔐 Privacy & Permissions

### Privacy Policy URL
https://www.tra.tools/privacy.html

### Terms of Service URL
https://www.tra.tools/terms.html

### Support URL
https://www.tra.tools/support.html

### Marketing URL
https://www.tra.tools

### Permissions Required

**Location (When In Use)**
- **Purpose**: Find nearby repair shops and service providers
- **Info.plist Key**: `NSLocationWhenInUseUsageDescription`
- **Description**: "We need your location to help you find nearby repair shops, mobile mechanics, and parts suppliers when you use the Service Finder feature."

**Camera (Optional)**
- **Purpose**: Photograph diagnostic screens and truck parts
- **Info.plist Key**: `NSCameraUsageDescription`
- **Description**: "We need camera access so you can photograph dashboard warnings, fault codes, and truck parts for AI-powered visual diagnosis."

**Photo Library (Optional)**
- **Purpose**: Upload existing photos for diagnosis
- **Info.plist Key**: `NSPhotoLibraryUsageDescription`
- **Description**: "We need access to your photo library so you can upload images of your truck, parts, or diagnostic screens for AI analysis."

---

## 📋 App Store Review Information

### Demo Account Credentials (for Review Team)
- **Email**: local.admin@truckassist.app
- **Password**: [REDACTED]
- **Subscription**: Pre-activated Fleet plan with sample data

### Review Notes

**Important Information for Reviewers:**

1. **AI Diagnostic Feature**: Enter any 5-digit fault code (e.g., "P0128") to test AI diagnostics. The AI will provide an explanation and severity rating.

2. **Location Services**: When testing the Service Finder, location permission is required. The app will request permission only when you tap "Use My Location" on the Service Finder screen.

3. **Telematics Integration**: Telematics features require active accounts with supported providers (Geotab, Motive, Samsara, etc.). Demo credentials are not available for third-party platforms. You can view the connection screens in the demo account under Settings > Telematics.

4. **Payment Testing**: Use Stripe test mode. Test card: 4242 4242 4242 4242, any future expiry, any CVC.

5. **Offline Functionality**: The app includes offline caching for diagnostic results. Saved diagnostic sessions can be viewed without internet.

**No Account Required for**: The Diagnostics page is accessible without registration (guest mode) to allow potential users to test the AI before subscribing.

### Age Rating

**App Store Connect Age Rating Questionnaire:**

- Unrestricted Web Access: **No** (only links to trusted repair videos and documentation)
- Gambling: **No**
- Contests: **No**
- Medical/Treatment Info: **No** (vehicle diagnostics, not medical)
- Alcohol, Tobacco, Drugs: **No**
- Profanity or Crude Humor: **No**
- Mature/Suggestive Themes: **No**
- Horror/Fear Themes: **No**
- Prolonged Graphic Violence: **No**
- Realistic Violence: **No**
- Cartoon/Fantasy Violence: **No**

**Recommended Rating**: **4+** (suitable for all ages)

---

## 🛡️ Data Privacy Questionnaire (Apple)

### Data Collection and Usage

**Account Information**
- ✅ Email Address
  - **Purpose**: Account functionality, app functionality
  - **Linked to user**: Yes
  - **Used for tracking**: No

**Contact Info**
- ✅ Name (optional)
  - **Purpose**: App functionality, personalization
  - **Linked to user**: Yes
  - **Used for tracking**: No

**Location**
- ✅ Precise Location
  - **Purpose**: App functionality (Service Finder)
  - **Linked to user**: No (not stored, used only during session)
  - **Used for tracking**: No

**Usage Data**
- ✅ Product Interaction
  - **Purpose**: Analytics, app functionality
  - **Linked to user**: No (anonymized)
  - **Used for tracking**: No

**Diagnostics**
- ✅ Crash Data
  - **Purpose**: App functionality, performance
  - **Linked to user**: No
  - **Used for tracking**: No

**User Content**
- ✅ Photos or Videos (optional)
  - **Purpose**: App functionality (diagnostic assistance)
  - **Linked to user**: Yes
  - **Used for tracking**: No

**Identifiers**
- ✅ User ID
  - **Purpose**: Account functionality
  - **Linked to user**: Yes
  - **Used for tracking**: No

**Financial Info**
- ✅ Payment Info
  - **Purpose**: App functionality (subscriptions)
  - **Linked to user**: Yes (processed by Stripe, not stored by us)
  - **Used for tracking**: No

**Other Data Types**
- ✅ Other Diagnostic Data (fault codes, truck info)
  - **Purpose**: App functionality
  - **Linked to user**: Yes
  - **Used for tracking**: No

**Do you or your third-party partners collect data from this app for tracking purposes?**
- **Answer**: No

---

## 🔍 Export Compliance

**Is your app encrypted?**
- **Answer**: Yes (HTTPS/TLS encryption for data transmission)

**Does your app use encryption exempt from regulations?**
- **Answer**: Yes (standard HTTPS encryption only, no proprietary cryptography)

**Export Compliance Code**: Available on request

---

## 📞 App Store Contact Information

**Copyright**: © 2026 Truck Repair Assistant. All rights reserved.

**Contact Information**
- **First Name**: Margarita
- **Last Name**: Makeeva
- **Email**: founder@tra.tools
- **Phone**: +1 215 252 0163

**Trade Representative Contact** (if applicable)
- Same as above or designated representative

---

## 🇷🇺 Статус данных для App Store Connect

> **Статус:** юридические документы и URL обновлены (`c33822b`). Контактное лицо и demo-аккаунт заполнены — см. ниже.

### Контактное лицо (App Store Connect → App Information)

| Поле | Значение | Статус |
|------|----------|--------|
| First Name | Margarita | ✅ |
| Last Name | Makeeva | ✅ |
| Phone | +1 215 252 0163 | ✅ |
| Email | founder@tra.tools | ✅ |

### Demo-аккаунт для Apple Review (App Review Information)

| Поле | Значение | Статус |
|------|----------|--------|
| Email | local.admin@truckassist.app | ✅ |
| Password | [REDACTED] | ✅ |
| Subscription | Fleet plan (pre-activated) | ✅ migration `025_demo_account_fleet_seed.sql` |
| Sample data | 2 грузовика + SPN 4364 диагностика | ✅ migration `025_demo_account_fleet_seed.sql` |

**Перед Submit:** войти в demo-аккаунт, убедиться что Fleet-подписка активна и есть тестовые данные.

### URL для App Store Connect (уже готовы — проверить после деплоя)

| URL | Назначение |
|-----|------------|
| https://www.tra.tools/privacy.html | Privacy Policy URL |
| https://www.tra.tools/terms.html | Terms of Service URL |
| https://www.tra.tools/support.html | Support URL |

### Графика

- [x] App Icon 1024×1024 px — `docs/app-store-screenshots/upload/AppIcon-1024.png` (из `LOGO_TRA_v1.svg`)
- [x] Скриншоты iPhone 6.7" (4 шт.) — `docs/app-store-screenshots/upload/iphone-6.7/`
- [x] Скриншоты iPhone 6.5" (4 шт.) — `docs/app-store-screenshots/upload/iphone-6.5/`
- [x] Оригиналы скриншотов — `docs/app-store-screenshots/01–04-*.png`
- [ ] Скриншоты iPad Pro 12.9" (2048×2732) — переснять на iPad simulator
- [ ] 5-й скриншот 6.7" (например Repair History) — опционально

### Быстрый чеклист перед Submit

- [x] Заполнить First Name, Last Name, Phone в App Store Connect (Margarita Makeeva, +1 215 252 0163)
- [x] Demo-аккаунт создан (local.admin@truckassist.app) — протестировать вход перед Submit
- [ ] Убедиться, что все три URL открываются в браузере
- [ ] Загрузить скриншоты и иконку
- [ ] Пройти Privacy Questionnaire (ответы — в секции выше в этом документе)
- [ ] Archive в Xcode → Upload to App Store Connect

---

## ✅ Pre-Submission Checklist

### Technical Requirements
- [ ] App builds successfully in Xcode with no errors
- [ ] All warnings resolved or documented
- [ ] Tested on real iPhone device (not just simulator)
- [ ] Tested on real iPad device
- [ ] App icon 1024x1024px added to Assets
- [ ] Launch screen configured
- [ ] Offline functionality tested
- [ ] Location permissions work correctly
- [ ] Camera permissions work correctly
- [ ] All external links work (privacy policy, terms, support)

### Metadata Requirements
- [ ] App name finalized (max 30 characters)
- [ ] Subtitle finalized (max 30 characters)
- [ ] Description written (max 4000 characters)
- [ ] Keywords selected (max 100 characters, comma-separated)
- [ ] Screenshots prepared for all required sizes
- [ ] App preview video created (optional)
- [ ] Privacy policy URL active and accessible
- [ ] Terms of service URL active and accessible
- [ ] Support URL active and accessible

### Account & Legal
- [ ] Apple Developer account active ($99/year)
- [ ] Stripe account in production mode
- [ ] Supabase production database configured
- [ ] All API keys switched from development to production
- [ ] Bundle ID registered in Apple Developer Portal
- [ ] App Store Connect listing created
- [ ] Age rating questionnaire completed
- [ ] Privacy questionnaire completed
- [ ] Export compliance completed
- [x] Demo account created for reviewers (local.admin@truckassist.app)

### iOS-Specific Requirements
- [ ] Info.plist permission descriptions added
- [ ] Capacitor configured correctly
- [ ] Push notification certificates configured (if using push)
- [ ] Universal links configured (if using deep links)
- [ ] App Tracking Transparency implemented (if tracking)

### Final QA
- [ ] All subscription flows tested
- [ ] Payment flow tested with Stripe test cards
- [ ] Account creation/login tested
- [ ] Password reset flow tested
- [ ] Diagnostic features tested with real fault codes
- [ ] Service locator tested with real locations
- [ ] Telematics connections tested (if applicable)
- [ ] Guest mode access tested
- [ ] Logout/delete account flows tested

---

## 🚀 Submission Process

### Step 1: Prepare Build
```bash
# Build production version
npm run build:mobile

# Sync to iOS
npm run cap:sync

# Open Xcode
npm run cap:open:ios
```

### Step 2: Archive in Xcode
1. Select "Any iOS Device (arm64)" as build target
2. Product > Archive
3. Wait for archive to complete
4. Click "Distribute App"
5. Choose "App Store Connect"
6. Upload

### Step 3: Complete App Store Connect Listing
1. Log in to App Store Connect
2. Add app metadata (name, description, screenshots)
3. Complete privacy questionnaire
4. Add demo account credentials in App Review Information
5. Add privacy policy and support URLs
6. Set pricing and availability
7. Submit for review

### Step 4: Monitor Review Status
- Review typically takes 24-48 hours
- Check App Store Connect for status updates
- Respond promptly to any rejection notes

---

## 📱 Google Play Store

### Play Store Metadata

**App Name**: Truck Repair Assistant  
**Short Description** (80 chars): AI-powered truck diagnostics, repair guides, and parts search for all trucks  
**Full Description**: [Same as App Store full description]  
**Category**: Auto & Vehicles > Tools  
**Content Rating**: Everyone  

### Screenshots Required
- 📱 Phone: 2-8 screenshots (1080x1920px or higher)
- 📱 7" Tablet: 2-8 screenshots (1024x600px or higher)
- 📱 10" Tablet: 2-8 screenshots (1280x800px or higher)

### Feature Graphic
- 1024x500px PNG or JPG
- No transparency
- Showcases key app features

### App Icon
- 512x512px PNG with transparency
- Must match iOS icon design

### Privacy Policy URL
https://www.tra.tools/privacy.html

### Data Safety Form
[Complete in Play Console - similar to App Store privacy questionnaire]

### Build Submission
```bash
# Build Android release
npm run build:mobile
npm run cap:sync

# Open Android Studio
npm run cap:open:android

# Build > Generate Signed Bundle/APK
# Choose Android App Bundle (AAB)
# Sign with keystore
# Upload to Play Console
```

---

## 📧 Contact & Support

For questions about App Store submission:
- **Email**: founder@tra.tools
- **Support**: founder@tra.tools

---

**Document Version**: 1.0  
**Last Updated**: June 18, 2026  
**Next Review**: Before each App Store submission
