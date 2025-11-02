#!/bin/bash
# Check status of all repos in the SOLVET System workspace

echo "📊 Status of all repositories"
echo "=============================="
echo ""

repos=("solvet-system" "no3d-tools-library" "no3d-tools-website" "no3d-tools-addon")

for repo in "${repos[@]}"; do
  if [ -d "$repo" ]; then
    echo "=================================================="
    echo "📦 $repo"
    echo "=================================================="
    cd "$repo"

    # Show current branch
    branch=$(git branch --show-current)
    echo "🌿 Branch: $branch"

    # Show remote
    remote=$(git remote get-url origin 2>/dev/null)
    if [ -n "$remote" ]; then
      echo "🔗 Remote: $remote"
    else
      echo "⚠️  No remote configured"
    fi

    # Show status
    status=$(git status -s)
    if [ -z "$status" ]; then
      echo "✅ Clean working tree"
    else
      echo "📝 Changes:"
      git status -s
    fi

    # Show commits ahead/behind
    if [ -n "$remote" ]; then
      git fetch --quiet 2>/dev/null
      ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null)
      behind=$(git rev-list --count HEAD..@{u} 2>/dev/null)

      if [ -n "$ahead" ] && [ "$ahead" -gt 0 ]; then
        echo "⬆️  $ahead commit(s) ahead of remote"
      fi
      if [ -n "$behind" ] && [ "$behind" -gt 0 ]; then
        echo "⬇️  $behind commit(s) behind remote"
      fi
      if [ "$ahead" = "0" ] && [ "$behind" = "0" ]; then
        echo "✅ Up to date with remote"
      fi
    fi

    # Show last commit
    echo "📝 Last commit:"
    git log -1 --pretty=format:"   %h - %s (%an, %ar)" 2>/dev/null
    echo ""

    cd ..
    echo ""
  else
    echo "⚠️  Directory $repo not found"
    echo ""
  fi
done

echo "=================================================="
echo "💡 Tips:"
echo "  - Run ./update-all.sh to pull latest from all repos"
echo "  - Open workspace: cursor .vscode/solvet.code-workspace"
