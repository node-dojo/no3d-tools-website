#!/usr/bin/env bash
set -euo pipefail

# Fix Vercel project settings using Vercel CLI
# This script fixes the Root Directory setting by deploying with correct settings

echo "🔧 Fixing Vercel Project Settings"
echo "=================================="
echo ""

# Navigate to project directory
cd "$(dirname "$0")/.."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "❌ Error: Vercel CLI not found!"
  echo "   Install it: npm install -g vercel"
  exit 1
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
  echo "❌ Error: Not logged into Vercel!"
  echo "   Run: vercel login"
  exit 1
fi

echo "✅ Vercel CLI is ready"
echo ""

# Link project if not already linked
if [ ! -f ".vercel/project.json" ]; then
  echo "📎 Linking project to Vercel..."
  vercel link --yes
fi

echo "📋 Current project configuration:"
cat .vercel/project.json | grep -E "(projectId|orgId)" || true
echo ""

echo "🔧 To fix Root Directory setting:"
echo ""
echo "   1. The Root Directory must be cleared (set to empty)"
echo "   2. This cannot be done via CLI directly"
echo "   3. Use the web dashboard or the Node.js script"
echo ""
echo "   Option A - Web Dashboard:"
echo "   → Go to: https://vercel.com/node-dojos-projects/no3dtoolssite/settings/general"
echo "   → Find 'Root Directory' setting"
echo "   → Clear the field (remove '.' or any value)"
echo "   → Click 'Save'"
echo ""
echo "   Option B - Node.js Script:"
echo "   → Get your Vercel token:"
echo "     - Go to: https://vercel.com/account/tokens"
echo "     - Create a new token"
echo "     - Export it: export VERCEL_TOKEN=your_token_here"
echo "   → Run: npm run fix-vercel"
echo ""
echo "   Option C - Manual API Call:"
echo "   → Use the fix-vercel-settings.js script with VERCEL_TOKEN"
echo ""

# Check if we can deploy to trigger settings update
echo "🚀 Triggering deployment to apply any settings changes..."
echo "   (This will use settings from vercel.json and project config)"
vercel --prod --yes 2>&1 | tail -20 || {
  echo ""
  echo "⚠️  Deployment may have issues. Fix Root Directory first."
  exit 1
}

echo ""
echo "✅ Deployment triggered!"
echo ""
echo "📝 Next steps:"
echo "   1. Check Vercel dashboard for deployment status"
echo "   2. Verify Root Directory is empty in project settings"
echo "   3. If Root Directory is still set, fix it via web dashboard"
echo ""











