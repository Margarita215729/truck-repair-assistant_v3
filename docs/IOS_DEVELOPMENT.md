# iOS Development Guide

## Prerequisites

### Software Requirements
- macOS 13.0 or later
- Xcode 15.0 or later
- Node.js 18.x or later
- CocoaPods 1.12 or later
- Git

### Apple Developer Account
- Apple Developer Program membership ($99/year) required for App Store distribution
- Free tier available for simulator testing only

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/Margarita215729/truck-repair-assistant_v3.git
cd truck-repair-assistant_v3
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create `.env.local` with the public variables compiled into the iOS bundle:

```bash
NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_BASE_URL=https://www.tra.tools
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
VITE_GOOGLE_CSE_ID=your_cse_id
```

`NEXT_PUBLIC_BASE_URL` must point to the canonical deployed Vercel URL. The native
app loads bundled web assets locally; all `/api/*` routes (AI diagnostics, maps,
parts search) are served from that URL.

Set `STORAGE_SUPABASE_SUPABASE_SECRET_KEY=sb_secret_xxx` only in the Vercel
server environment. Never place a Supabase secret, service-role JWT, anon JWT,
JWT secret, database password, `GITHUB_TOKEN`, or `GEMINI_API_KEY` under a
`VITE_` or `NEXT_PUBLIC_` name.

Run `npm run validate:env` before building. For a format/policy check without
network calls, use `npm run validate:env -- --no-connectivity`. See
[../.env.example](../.env.example) for the complete variable reference.

### 4. Build and Sync

```bash
npm run mobile:prepare
```

This command:
- Builds the React application (`npm run build:mobile`)
- Syncs web assets to native project (`npx cap sync`)

Then verify the generated web, iOS, and Android assets contain no server secrets:

```bash
npm run security:scan
```

### 5. Install iOS Dependencies

```bash
cd ios/App
pod install
cd ../..
```

### 6. Open in Xcode

```bash
npx cap open ios
```

**Important:** Open `App.xcworkspace`, not `App.xcodeproj`.

## Development Workflow

### Standard Build Process

1. Make changes to React code in `src/`
2. Build and sync: `npm run mobile:prepare`
3. In Xcode: Product → Build (⌘+B)
4. Run: Product → Run (⌘+R)

### Live Reload Development (Optional)

For rapid development, configure Capacitor live reload:

1. Start development server:
   ```bash
   npm run dev
   ```

2. Note the Network URL (e.g., `http://10.0.0.70:5173`)

3. Create `capacitor.config.dev.ts`:
   ```typescript
   import type { CapacitorConfig } from '@capacitor/cli';
   
   const config: CapacitorConfig = {
     appId: 'com.truckrepairassistant.mobile',
     appName: 'Truck Repair Assistant',
     webDir: 'dist',
     server: {
       url: 'http://YOUR_LOCAL_IP:5173',
       cleartext: true
     }
   };
   
   export default config;
   ```

4. Apply dev configuration:
   ```bash
   cp capacitor.config.dev.ts capacitor.config.ts
   npx cap sync ios
   ```

5. Build and run in Xcode

6. **Before production build:** Restore production configuration:
   ```bash
   git checkout capacitor.config.ts
   npm run mobile:prepare
   ```

## Code Signing

### Development Signing

1. Open project in Xcode
2. Select project "App" in navigator
3. Select target "App"
4. Go to "Signing & Capabilities" tab
5. Select your Team from dropdown
6. Xcode will automatically manage provisioning profile

### Distribution Signing

For App Store distribution:

1. In Xcode, select "Any iOS Device (arm64)" as build target
2. Product → Archive
3. Organizer window opens after successful archive
4. Select archive → Distribute App
5. Follow App Store Connect upload wizard

## Testing

### Simulator Testing

```bash
npx cap open ios
# Select simulator from Xcode
# Product → Run (⌘+R)
```

### Device Testing

1. Connect iOS device via USB
2. Trust computer on device
3. In Xcode, select your device from device dropdown
4. Product → Run (⌘+R)

## Building for App Store

### Pre-submission Checklist

- [ ] Public mobile variables use only approved `VITE_`/`NEXT_PUBLIC_` names
- [ ] Server secrets are configured in Vercel, not as client variables
- [ ] `npm run validate:env` passes
- [ ] `npm run security:scan` passes after `npm run mobile:prepare`
- [ ] App icons and splash screens configured
- [ ] Bundle identifier matches App Store Connect
- [ ] Version and build number incremented
- [ ] All required permissions configured in Info.plist
- [ ] Privacy policy URL configured
- [ ] Production configuration active (not dev server)

### Build Process

1. Ensure production configuration:
   ```bash
   git checkout capacitor.config.ts
   npm run mobile:prepare
   ```

2. Open in Xcode:
   ```bash
   npx cap open ios
   ```

3. Increment version:
   - Select project → General tab
   - Update Version (e.g., 3.0.0)
   - Update Build (e.g., 1)

4. Create archive:
   - Product → Scheme → Edit Scheme
   - Set Build Configuration to "Release"
   - Product → Archive

5. Upload to App Store Connect:
   - Window → Organizer
   - Select archive
   - Distribute App → App Store Connect
   - Follow wizard

See [APP_STORE_SUBMISSION.md](./APP_STORE_SUBMISSION.md) for complete submission process.

## Troubleshooting

### CocoaPods Installation Issues

```bash
sudo gem install cocoapods
pod repo update
```

### Build Failures

1. Clean build folder: Product → Clean Build Folder (⌘+Shift+K)
2. Delete derived data:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```
3. Reinstall pods:
   ```bash
   cd ios/App
   pod deintegrate
   pod install
   cd ../..
   ```

### Code Signing Errors

- Verify Team is selected in Signing & Capabilities
- Check Bundle Identifier matches App Store Connect
- Ensure provisioning profiles are valid
- Try automatic signing first before manual

### Live Reload Connection Issues

- Verify development server is running (`npm run dev`)
- Check firewall allows Node.js connections
- Ensure device and computer on same network
- Verify IP address is correct in `capacitor.config.ts`
- Test connectivity: `curl http://YOUR_IP:5173`

### APIs Not Working in Simulator (Auth / Diagnostics Errors)

Symptoms:
- Login shows *"Authentication service is not configured"*
- Diagnostics shows *"Service temporarily unavailable"* or `diagnostics.aiUnavailable`

Fix:

1. Confirm `.env.local` contains only the approved public Supabase configuration:
   ```bash
   NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
   NEXT_PUBLIC_BASE_URL=https://www.tra.tools
   ```

   The Vercel project must separately contain the server-only
   `STORAGE_SUPABASE_SUPABASE_SECRET_KEY=sb_secret_xxx`.

2. Rebuild native assets (env vars are baked in at build time):
   ```bash
   npm run mobile:prepare
   ```

3. Rebuild and run in Xcode (⌘+Shift+K clean, then ⌘+R).

4. Validate configuration:
   ```bash
   npm run validate:env
   npm run security:scan
   ```

Without `NEXT_PUBLIC_BASE_URL`, the iOS app cannot reach Vercel serverless routes (`/api/ai-proxy`, `/api/geocode`, etc.) because Capacitor serves static files from `capacitor://localhost`.

## Project Structure

```
ios/
└── App/
    ├── App.xcworkspace          # Open this in Xcode
    ├── App.xcodeproj
    ├── Podfile                  # CocoaPods configuration
    ├── Podfile.lock
    └── App/
        ├── Info.plist           # App configuration
        ├── Assets.xcassets      # Icons and images
        └── App/
            └── capacitor.config.json
```

## Additional Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## Support

For technical issues, contact development team or refer to project documentation in `docs/` directory.
