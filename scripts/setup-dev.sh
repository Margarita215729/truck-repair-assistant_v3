#!/bin/bash

# Auto-detect local IP and create dev configuration for Capacitor Live Reload

set -e

echo "🔍 Detecting local IP address..."

# Try to get local IP (macOS)
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")

if [ -z "$LOCAL_IP" ]; then
  echo "❌ Could not auto-detect local IP address."
  echo "Please find your local IP manually:"
  echo "  macOS: System Preferences → Network"
  echo "  Linux: ip addr show"
  read -p "Enter your local IP address: " LOCAL_IP
fi

echo "✅ Using IP: $LOCAL_IP"

# Create dev configuration
cat > capacitor.config.dev.ts << EOF
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.truckrepairassistant.mobile',
  appName: 'Truck Repair Assistant',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'http://${LOCAL_IP}:5173',
    cleartext: true
  }
};

export default config;
EOF

echo "✅ Created capacitor.config.dev.ts"
echo ""
echo "Next steps:"
echo "1. Start dev server: npm run dev"
echo "2. Apply dev config: cp capacitor.config.dev.ts capacitor.config.ts"
echo "3. Sync to iOS: npx cap sync ios"
echo "4. Open in Xcode: npx cap open ios"
echo "5. Build and run"
echo ""
echo "⚠️  IMPORTANT: Before production build, restore config:"
echo "   git checkout capacitor.config.ts"
echo "   npm run mobile:prepare"
