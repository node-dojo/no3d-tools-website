#!/bin/bash
# Setup script for Polar MCP in Cursor

# Check if POLAR_API_TOKEN is set
if [ -z "$POLAR_API_TOKEN" ]; then
    echo "Error: POLAR_API_TOKEN environment variable is not set"
    echo ""
    echo "Please set it using:"
    echo "  export POLAR_API_TOKEN='polar_oat_...'"
    echo ""
    echo "You can get your token from: https://polar.sh/settings/api"
    exit 1
fi

# Update .mcp.json with the actual token
# Note: This stores the token in the file. For better security, consider using
# a secrets manager or environment variable interpolation if Cursor supports it.

MCP_CONFIG=".mcp.json"

# Create a backup
cp "$MCP_CONFIG" "${MCP_CONFIG}.backup"

# Update the config with the actual token
# Note: Some MCP implementations may support ${ENV_VAR} interpolation
# If your version doesn't, you may need to replace this manually
cat > "$MCP_CONFIG" <<EOF
{
  "mcpServers": {
    "Polar": {
      "type": "http",
      "url": "https://mcp.polar.sh/mcp/polar-mcp",
      "headers": {
        "Authorization": "Bearer $POLAR_API_TOKEN"
      }
    }
  }
}
EOF

echo "✓ Polar MCP configured successfully"
echo ""
echo "Configuration file: $MCP_CONFIG"
echo "API Token: ${POLAR_API_TOKEN:0:15}..."
echo ""
echo "Next steps:"
echo "1. Restart Cursor to apply the changes"
echo "2. Verify the connection works"
echo ""
echo "Note: Your token is stored in $MCP_CONFIG"
echo "      Make sure this file is in your .gitignore!"


