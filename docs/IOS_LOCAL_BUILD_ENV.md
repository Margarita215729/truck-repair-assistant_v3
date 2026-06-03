# iOS Local Build - Environment Variables

This document lists the environment variables required for local iOS builds. These variables are baked into the app at build time by Vite.

## Quick Setup

1. Copy `.env.example` to `.env.local` in project root
2. Fill in the values from Vercel (see below)
3. Run `npm run mobile:prepare`
4. Open in Xcode and build

## Getting Values from Vercel

### Access Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `truck-repair-assistant_v3`
3. Navigate to: **Settings** → **Environment Variables**
4. Copy the values listed below

## Required Client-Side Variables

These variables are prefixed with `VITE_` and are bundled into the app at build time.

### Supabase (Authentication & Database)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find in Vercel:**
- Variable name: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Alternative source:**
- Supabase Dashboard → Project Settings → API

### Google Maps (Service Locator)

```bash
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
```

**Where to find in Vercel:**
- Variable name: `VITE_GOOGLE_MAPS_API_KEY`

### YouTube (Repair Videos)

```bash
VITE_YOUTUBE_API_KEY=AIzaSy...
```

**Where to find in Vercel:**
- Variable name: `VITE_YOUTUBE_API_KEY`

### Google Custom Search (Forum Search)

```bash
VITE_GOOGLE_CSE_ID=your-cse-id
```

**Where to find in Vercel:**
- Variable name: `VITE_GOOGLE_CSE_ID`

### Stripe (Payments)

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Owner-Operator plan prices
VITE_OWNER_PRICE_MONTHLY=price_...
VITE_OWNER_PRICE_ANNUAL=price_...

# Fleet plan prices
VITE_FLEET_PRICE_MONTHLY=price_...
VITE_FLEET_PRICE_ANNUAL=price_...
```

**Where to find in Vercel:**
- Variable names: `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_OWNER_PRICE_MONTHLY`, etc.

**Alternative source:**
- Stripe Dashboard → Developers → API keys (Publishable key)
- Stripe Dashboard → Products → Pricing (Price IDs)

## Optional Client-Side Variables

### AI Services (Development Only)

**⚠️ WARNING:** These should only be enabled for local development. Never commit actual values to git.

```bash
# Uncomment for local AI testing only
# VITE_GITHUB_TOKEN=ghp_...
# VITE_GEMINI_API_KEY=AIzaSy...
```

**Where to find in Vercel:**
- Variable names: `GITHUB_TOKEN` and `GEMINI_API_KEY` (without VITE_ prefix)
- You'll need to add `VITE_` prefix for client-side usage

**Note:** In production, AI requests go through Vercel serverless functions which use server-side variables. Client-side AI variables are only needed if you're testing AI features directly from the app without the backend.

## Variables NOT Needed for iOS Build

These are server-side only (used by Vercel Functions):

- `SUPABASE_SERVICE_ROLE_KEY` - Backend only
- `STRIPE_SECRET_KEY` - Backend only
- `STRIPE_WEBHOOK_SECRET` - Backend only
- `GITHUB_TOKEN` - Backend only (unless testing AI locally)
- `GEMINI_API_KEY` - Backend only (unless testing AI locally)
- `GOOGLE_MAPS_API_KEY` - Backend only (without VITE_ prefix)
- `BRAVE_API_KEY` - Backend only (parts/forum search)
- `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` - Backend only
- `FINDITPARTS_*` - Backend only

## Complete .env.local Template

Create `.env.local` in project root:

```bash
# ============================
# iOS Local Build Configuration
# ============================

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Services
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
VITE_YOUTUBE_API_KEY=AIzaSy...
VITE_GOOGLE_CSE_ID=your-cse-id

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_OWNER_PRICE_MONTHLY=price_...
VITE_OWNER_PRICE_ANNUAL=price_...
VITE_FLEET_PRICE_MONTHLY=price_...
VITE_FLEET_PRICE_ANNUAL=price_...

# ============================
# Optional - Development Only
# ============================

# Uncomment ONLY for local AI testing (DO NOT COMMIT)
# VITE_GITHUB_TOKEN=ghp_...
# VITE_GEMINI_API_KEY=AIzaSy...
```

## Build Process

1. **Create `.env.local`** (never commit this file - it's in `.gitignore`)
2. **Fill in values** from Vercel or service dashboards
3. **Build app**: `npm run mobile:prepare`
4. **Sync to iOS**: This is done automatically by the build script
5. **Open Xcode**: `npx cap open ios`
6. **Build & Run**: ⌘+R

## Verification

After creating `.env.local`, verify the build includes your variables:

```bash
npm run build:mobile
cat dist/assets/index-*.js | grep -o "supabase.co" | head -1
```

If you see your Supabase URL, the variables are being injected correctly.

## Troubleshooting

### Variables not appearing in app

1. **Check file name**: Must be `.env.local` (not `.env` or `.env.development`)
2. **Check prefix**: Client variables must start with `VITE_`
3. **Rebuild**: Run `npm run mobile:prepare` after changing `.env.local`
4. **Clear cache**: Delete `dist/` folder and rebuild

### API calls failing

1. **Verify values**: Compare `.env.local` with Vercel dashboard
2. **Check quotes**: No quotes around values in `.env` files
3. **Check domains**: Ensure Supabase/API URLs are correct
4. **Check keys**: Ensure API keys are active and not expired

### Backend features not working

This is expected - iOS build only includes client-side code. Backend features (AI diagnostics, parts search, etc.) require Vercel serverless functions. For full functionality:

1. **Deploy backend**: Ensure Vercel deployment is active
2. **Update API URLs**: If using custom domain, update in app config
3. **Test endpoints**: Use curl to verify Vercel functions respond

## Security Notes

- ✅ **Safe to include**: `VITE_*` variables (they're public in the app bundle)
- ❌ **Never include**: Server-side secrets (`STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- ⚠️ **Careful with**: AI keys in `VITE_` form (only for development, disable in production)
- 🔒 **Never commit**: `.env.local` file (already in `.gitignore`)

## Support

If you encounter issues with environment variables:

1. Check [docs/IOS_DEVELOPMENT.md](./IOS_DEVELOPMENT.md) for build process
2. Verify Vercel environment variables are set correctly
3. Ensure API keys have proper permissions and are active
4. Contact development team for missing credentials
