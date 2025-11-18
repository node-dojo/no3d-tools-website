#!/usr/bin/env python3
"""
Simple Chrome DevTools Protocol client to debug the 3D viewer
"""
import json
import requests
import websocket
import sys

# Get list of pages
response = requests.get('http://localhost:9222/json')
pages = response.json()

# Find first page
page = None
for p in pages:
    if p.get('type') == 'page':
        page = p
        break

if not page:
    print("❌ No pages found in Chrome")
    sys.exit(1)

print(f"📄 Found page: {page['title']}")
print(f"🔗 URL: {page['url']}")

# Connect to WebSocket
ws_url = page['webSocketDebuggerUrl']
print(f"🔌 Connecting to: {ws_url}")

ws = websocket.create_connection(ws_url)

# Enable Page domain
ws.send(json.dumps({'id': 1, 'method': 'Page.enable'}))
ws.recv()

# Navigate to 3D viewer
print("🔄 Navigating to 3D viewer...")
ws.send(json.dumps({
    'id': 2,
    'method': 'Page.navigate',
    'params': {'url': 'http://localhost:8080/no3d-tools-website/3d-viewer/'}
}))
result = json.loads(ws.recv())
print(f"✅ Navigation result: {result}")

# Wait for page load
import time
time.sleep(3)

# Enable Console domain
ws.send(json.dumps({'id': 3, 'method': 'Console.enable'}))
ws.recv()

# Enable Runtime domain
ws.send(json.dumps({'id': 4, 'method': 'Runtime.enable'}))
ws.recv()

# Get console messages
print("\n📝 Console messages:")
ws.send(json.dumps({
    'id': 5,
    'method': 'Runtime.evaluate',
    'params': {
        'expression': 'console.log("✅ Chrome DevTools MCP connected!"); "Ready"'
    }
}))
result = json.loads(ws.recv())
print(result)

ws.close()
print("\n✅ Chrome DevTools connection successful!")
