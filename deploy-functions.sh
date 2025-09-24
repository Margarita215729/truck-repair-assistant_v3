#!/bin/bash

# Supabase Edge Functions Manual Deployment Script
# Usage: bash deploy-functions.sh

set -e

echo "🚀 Deploying Supabase Edge Functions..."

# Supabase configuration
SUPABASE_URL="https://tismknqcuuzydlsvzwei.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpc21rbnFjdXV6eWRsc3Z6d2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MjAzOTAsImV4cCI6MjA3Mzk5NjM5MH0.c5D-h8sePeWzIG3EivEnpsxGMi8p5YJHpZB-_BodjNo"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpc21rbnFjdXV6eWRsc3Z6d2VpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQyMDM5MCwiZXhwIjoyMDczOTk2MzkwfQ.RfYV-Go-_BdH4vePIJN3a47hW2I62aCAqVJk9LmHAow"
PROJECT_REF="tismknqcuuzydlsvzwei"

echo "📋 Available functions:"
echo "  1. ai-analyze - AI diagnostic analysis"
echo "  2. diagnostics - Diagnostic management"
echo "  3. reports - Report generation"
echo "  4. fleet-stats - Fleet statistics"
echo "  5. auth - User authentication"
echo "  6. voice-recording - Voice recording"
echo "  7. health - Health check"
echo ""
echo "📁 Function files:"

# List all functions
functions=("ai-analyze" "diagnostics" "reports" "fleet-stats" "auth" "voice-recording" "health")
for func in "${functions[@]}"; do
  if [ -f "supabase/functions/$func/index.ts" ]; then
    echo "  ✅ $func - supabase/functions/$func/index.ts"
  else
    echo "  ❌ $func - supabase/functions/$func/index.ts (missing)"
  fi
done

echo ""
echo "🔧 Deployment options:"
echo "  1. Deploy all functions"
echo "  2. Deploy specific function"
echo "  3. Check function status"
echo "  4. Test functions"
echo ""

read -p "Choose option (1-4): " choice

case $choice in
  1)
    echo "🚀 Deploying all functions..."
    for func in "${functions[@]}"; do
      if [ -f "supabase/functions/$func/index.ts" ]; then
        echo "📦 Deploying $func..."
        # This would be the deployment command when CLI is properly set up
        echo "   Command: npx supabase functions deploy $func"
      fi
    done
    ;;
  2)
    echo "📋 Available functions:"
    for i in "${!functions[@]}"; do
      echo "  $((i+1)). ${functions[$i]}"
    done
    read -p "Choose function number: " func_num
    func="${functions[$((func_num-1))]}"
    if [ -f "supabase/functions/$func/index.ts" ]; then
      echo "🚀 Deploying $func..."
      echo "   Command: npx supabase functions deploy $func"
    else
      echo "❌ Function $func not found"
    fi
    ;;
  3)
    echo "🔍 Checking function status..."
    echo "   This requires Supabase CLI authentication"
    echo "   Run: npx supabase functions list"
    ;;
  4)
    echo "🧪 Testing functions..."
    echo "   1. Test health endpoint"
    echo "   2. Test AI analysis"
    echo "   3. Test diagnostics"
    read -p "Choose test (1-3): " test_choice

    case $test_choice in
      1)
        echo "🏥 Testing health endpoint..."
        curl -k -s "https://$PROJECT_REF.supabase.co/functions/v1/health" | jq . || echo "Health check response (raw):" && curl -k -s "https://$PROJECT_REF.supabase.co/functions/v1/health"
        ;;
      2)
        echo "🤖 Testing AI analysis..."
        curl -k -X POST "https://$PROJECT_REF.supabase.co/functions/v1/ai-analyze" \
          -H "Content-Type: application/json" \
          -d '{
            "symptoms": "Engine makes knocking sound",
            "truckModel": "Cascadia",
            "truckMake": "Freightliner"
          }' | jq . || echo "AI analysis response (raw):" && curl -k -X POST "https://$PROJECT_REF.supabase.co/functions/v1/ai-analyze" \
          -H "Content-Type: application/json" \
          -d '{
            "symptoms": "Engine makes knocking sound",
            "truckModel": "Cascadia",
            "truckMake": "Freightliner"
          }'
        ;;
      3)
        echo "📊 Testing diagnostics..."
        curl -k -X POST "https://$PROJECT_REF.supabase.co/functions/v1/diagnostics" \
          -H "Content-Type: application/json" \
          -d '{
            "truckMake": "Freightliner",
            "truckModel": "Cascadia",
            "symptoms": "Engine knocking",
            "costEstimate": 500
          }' | jq . || echo "Diagnostics response (raw):" && curl -k -X POST "https://$PROJECT_REF.supabase.co/functions/v1/diagnostics" \
          -H "Content-Type: application/json" \
          -d '{
            "truckMake": "Freightliner",
            "truckModel": "Cascadia",
            "symptoms": "Engine knocking",
            "costEstimate": 500
          }'
        ;;
    esac
    ;;
  *)
    echo "❌ Invalid option"
    ;;
esac

echo ""
echo "📝 Next steps:"
echo "1. Get Supabase access token from: https://supabase.com/dashboard/account/tokens"
echo "2. Run: export SUPABASE_ACCESS_TOKEN=your_token"
echo "3. Run: npx supabase login"
echo "4. Run: npx supabase link --project-ref $PROJECT_REF"
echo "5. Run: npx supabase functions deploy"
echo ""
echo "🔗 Useful links:"
echo "  - Supabase Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF"
echo "  - API Docs: https://supabase.com/docs/guides/functions"
echo "  - CLI Docs: https://supabase.com/docs/guides/cli"
