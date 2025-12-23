#!/usr/bin/env bash
set -euo pipefail

# Fix Vercel project settings using Doppler for secrets management
# This script uses Doppler to get VERCEL_TOKEN and runs the fix script

echo "🔧 Fixing Vercel Settings with Doppler"
echo "======================================"
echo ""

# Navigate to project root (where Doppler is configured)
cd "$(dirname "$0")/../../.."

# Check if doppler is installed
if ! command -v doppler &> /dev/null; then
  echo "❌ Error: Doppler CLI not found!"
  echo "   Install it: https://docs.doppler.com/docs/install-cli"
  exit 1
fi

# Check if doppler is configured
if ! doppler secrets get VERCEL_TOKEN --plain &> /dev/null; then
  echo "⚠️  VERCEL_TOKEN not found in Doppler"
  echo ""
  echo "📝 To add VERCEL_TOKEN to Doppler:"
  echo ""
  echo "   1. Get your Vercel token:"
  echo "      → Go to: https://vercel.com/account/tokens"
  echo "      → Create a new token"
  echo "      → Copy the token"
  echo ""
  echo "   2. Add to Doppler:"
  echo "      doppler secrets set VERCEL_TOKEN=your_token_here"
  echo ""
  echo "   Or set it interactively:"
  echo "      doppler secrets set VERCEL_TOKEN"
  echo ""
  read -p "Press Enter after adding VERCEL_TOKEN to Doppler, or Ctrl+C to cancel..."
fi

# Verify token exists now
if ! doppler secrets get VERCEL_TOKEN --plain &> /dev/null; then
  echo "❌ VERCEL_TOKEN still not found in Doppler"
  exit 1
fi

echo "✅ Found VERCEL_TOKEN in Doppler"
echo ""

# Run the fix script with Doppler
echo "🚀 Running fix script with Doppler secrets..."
echo ""

cd "no3d-tools-website"

doppler run -- node scripts/fix-vercel-settings.js

echo ""
echo "✅ Fix script completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Verify Root Directory is empty in Vercel dashboard"
echo "   2. Check for any configuration warnings"
echo "   3. Test auto-deployment with a new commit"













