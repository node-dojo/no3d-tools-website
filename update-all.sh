#!/bin/bash
# Updates all repositories in the SOLVET System workspace

echo "🔄 Updating all repositories..."
echo ""

repos=("solvet-system" "no3d-tools-library" "no3d-tools-website" "no3d-tools-addon")

for repo in "${repos[@]}"; do
  if [ -d "$repo" ]; then
    echo "=================================================="
    echo "📦 Updating $repo"
    echo "=================================================="
    cd "$repo"

    # Stash any local changes
    if [[ -n $(git status -s) ]]; then
      echo "  ⚠️  Stashing local changes..."
      git stash
      stashed=true
    else
      stashed=false
    fi

    # Fetch and pull
    git fetch --all
    current_branch=$(git branch --show-current)
    echo "  🌿 On branch: $current_branch"

    git pull origin "$current_branch"

    # Pop stash if we stashed
    if [ "$stashed" = true ]; then
      echo "  📥 Restoring stashed changes..."
      git stash pop
    fi

    cd ..
    echo ""
  else
    echo "⚠️  Directory $repo not found - skipping"
    echo ""
  fi
done

echo "✅ All repos updated!"
echo ""
echo "💡 Tip: Run ./status-all.sh to see the status of all repos"
