#!/usr/bin/env bash
set -euo pipefail

# Helper script to add VERCEL_TOKEN to Doppler
# This guides you through getting a Vercel token and adding it to Doppler

echo "🔑 Adding VERCEL_TOKEN to Doppler"
echo "=================================="
echo ""

# Navigate to project root (where Doppler is configured)
cd "$(dirname "$0")/../../.."

# Check if doppler is installed
if ! command -v doppler &> /dev/null; then
  echo "❌ Error: Doppler CLI not found!"
  echo "   Install it: https://docs.doppler.com/docs/install-cli"
  exit 1
fi

echo "📝 Steps to add VERCEL_TOKEN:"
echo ""
echo "   1. Get your Vercel token:"
echo "      → Open: https://vercel.com/account/tokens"
echo "      → Click 'Create Token'"
echo "      → Name it: 'fix-vercel-settings' (or any name)"
echo "      → Copy the token"
echo ""
echo "   2. Add to Doppler (choose one method):"
echo ""
echo "   Method A - Interactive (recommended):"
echo "      doppler secrets set VERCEL_TOKEN"
echo "      (Then paste your token when prompted)"
echo ""
echo "   Method B - Direct:"
echo "      doppler secrets set VERCEL_TOKEN=your_token_here"
echo ""
echo "   Method C - From clipboard (macOS):"
echo "      doppler secrets set VERCEL_TOKEN=\"\$(pbpaste)\""
echo ""

read -p "Press Enter when you've added VERCEL_TOKEN to Doppler, or Ctrl+C to cancel..."

# Verify token was added
echo ""
echo "🔍 Verifying VERCEL_TOKEN in Doppler..."
if doppler secrets get VERCEL_TOKEN --plain &> /dev/null; then
  TOKEN_LENGTH=$(doppler secrets get VERCEL_TOKEN --plain | wc -c)
  if [ "$TOKEN_LENGTH" -gt 10 ]; then
    echo "✅ VERCEL_TOKEN found in Doppler (${TOKEN_LENGTH} characters)"
    echo ""
    echo "🚀 Now you can run:"
    echo "   cd no3d-tools-website"
    echo "   doppler run -- node scripts/fix-vercel-settings.js"
    echo ""
    echo "   Or use the helper script:"
    echo "   ./no3d-tools-website/scripts/fix-vercel-with-doppler.sh"
  else
    echo "⚠️  Token seems too short. Please verify it's correct."
    exit 1
  fi
else
  echo "❌ VERCEL_TOKEN not found in Doppler"
  echo "   Please add it using one of the methods above"
  exit 1
fi














