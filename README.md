# Truck Repair Assistant - Version 3.0.0

**Developer:** Makevia LLC  
**License:** Proprietary

## Overview

Truck Repair Assistant is a professional AI-powered mobile and web application designed to assist truck drivers and fleet managers with vehicle diagnostics, repair guidance, parts sourcing, and service location.

## Core Features

- **AI Diagnostics**: Visual fault code analysis using advanced AI models
- **Parts Search**: Real-time pricing and availability across multiple suppliers
- **Service Locator**: GPS-based service center and parts supplier finder
- **Telematics Integration**: OAuth integration with Geotab, Motive, Samsara, Verizon Connect, Omnitracs
- **Multi-language Support**: English, Russian, Spanish
- **Offline Capability**: Core features available without internet connection

## Technology Stack

- **Frontend**: React 18.3.0, Vite, TailwindCSS
- **Mobile**: Capacitor 7.0.2 (iOS/Android)
- **Backend**: Supabase, Vercel Serverless Functions
- **AI**: GitHub Models, Google Gemini
- **APIs**: Google Maps, Brave Search, YouTube Data API
- **Payments**: Stripe

## System Requirements

### Web Development
- Node.js 18.x or later
- npm 9.x or later

### iOS Development
- macOS 13.0 or later
- Xcode 15.0 or later
- CocoaPods 1.12 or later
- Apple Developer Program membership

### Android Development
- Android Studio Hedgehog or later
- Android SDK Platform 34
- Gradle 8.x

## Installation

```bash
git clone https://github.com/Margarita215729/truck-repair-assistant_v3.git
cd truck-repair-assistant_v3
npm install
```

## Environment Configuration

Create `.env.local` file in project root:

```bash
# Supabase
NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL=https://your-project.supabase.co
STORAGE_SUPABASE_SUPABASE_ANON_KEY=your_supabase_anon_key
STORAGE_SUPABASE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Services
VITE_GITHUB_TOKEN=your_github_token
VITE_GEMINI_API_KEY=your_gemini_key

# Google Services
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_GOOGLE_CSE_ID=your_custom_search_engine_id
VITE_YOUTUBE_API_KEY=your_youtube_api_key

# Search
BRAVE_API_KEY=your_brave_search_key

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

See [docs/API_CONFIGURATION.md](docs/API_CONFIGURATION.md) for complete reference.

## Development

### Web Development

```bash
npm install          # Install dependencies
npm run dev         # Start development server
npm run build       # Build for production
npm test            # Run tests
npm run lint        # Lint code
npm run typecheck   # TypeScript type checking
```

### Mobile Development

iOS:
```bash
npm run mobile:prepare      # Build and sync
cd ios/App && pod install  # Install iOS dependencies
npm run cap:open:ios       # Open in Xcode
```

Android:
```bash
npm run mobile:prepare        # Build and sync
npm run cap:open:android     # Open in Android Studio
```

## Project Structure

```
truck-repair-assistant_v3/
├── src/                    # Application source code
│   ├── pages/             # Route components
│   ├── components/        # Reusable UI components
│   ├── services/          # Business logic and API clients
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   ├── config/            # Configuration files
│   └── i18n/              # Internationalization
├── api/                   # Vercel serverless functions
│   ├── telematics/        # Telematics OAuth integrations
│   └── parts/             # Parts search endpoints
├── public/                # Static assets
├── docs/                  # Technical documentation
├── supabase/             # Database migrations and config
├── ios/                  # iOS native project (Capacitor)
├── android/              # Android native project (Capacitor)
└── scripts/              # Development automation scripts
```

## Testing

```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
```

## Documentation

- [App Store Submission](docs/APP_STORE_SUBMISSION.md) - iOS deployment guide
- [iOS Development](docs/IOS_DEVELOPMENT.md) - iOS development workflow
- [API Configuration](docs/API_CONFIGURATION.md) - Environment variables reference
- [App Store Readiness](docs/APP_STORE_READINESS.md) - Pre-launch checklist

## Deployment

### Web (Vercel)
Automatic deployment on push to `main` branch. Configure environment variables in Vercel dashboard.

### Mobile
See [docs/APP_STORE_SUBMISSION.md](docs/APP_STORE_SUBMISSION.md) for App Store submission process.

## Legal

- [Privacy Policy](PRIVACY_POLICY.md)
- [Terms of Service](TERMS_OF_SERVICE.md)
- [Patent Disclosure](PATENT_DISCLOSURE.md)

## Support

For technical support or business inquiries:
- Email: support@truckrepairassistant.com
- Website: https://truckrepairassistant.com

## License

Copyright © 2026 Makevia LLC. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use of this software is strictly prohibited.
