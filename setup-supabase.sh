#!/bin/bash

# Supabase Setup Script
echo "🚀 Setting up Supabase CLI..."

# Set service role key for functions
export SUPABASE_SERVICE_ROLE_KEY=sb_secret__L0YQiuqsjfpK2bzx32nXA_4uLTqTZ9

# Check if we have access token
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  You need a Personal Access Token for CLI operations"
    echo ""
    echo "📋 To get a Personal Access Token:"
    echo "1. Go to: https://supabase.com/dashboard/account/tokens"
    echo "2. Click 'Generate new token'"
    echo "3. Copy the token (format: sbp_0102...)"
    echo "4. Run: export SUPABASE_ACCESS_TOKEN=your_token"
    echo ""
    read -p "Do you have a Personal Access Token? (y/n): " has_token

    if [ "$has_token" = "y" ]; then
        read -p "Enter your Personal Access Token: " SUPABASE_ACCESS_TOKEN
        export SUPABASE_ACCESS_TOKEN
    else
        echo "❌ Please get a Personal Access Token first"
        echo "🔗 https://supabase.com/dashboard/account/tokens"
        exit 1
    fi
fi

echo "🔗 Linking project..."
npx supabase link --project-ref tismknqcuuzydlsvzwei

echo "📦 Deploying functions..."
npx supabase functions deploy

echo "✅ Deployment complete!"
echo ""
echo "🧪 Testing functions..."
curl -k -s "https://tismknqcuuzydlsvzwei.supabase.co/functions/v1/health" | jq .

echo ""
echo "🎉 Supabase functions are now deployed!"
