#!/usr/bin/env python3
import json
import requests
import websocket

# Get page WebSocket
response = requests.get('http://localhost:9222/json')
pages = response.json()
ws_url = None
for p in pages:
    if p.get('type') == 'page':
        ws_url = p['webSocketDebuggerUrl']
        print(f"📄 Page: {p['title']}")
        break

if not ws_url:
    print("❌ No page found")
    exit(1)

# Connect with timeout
ws = websocket.create_connection(ws_url, timeout=2)

# Enable Runtime
ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
ws.settimeout(1)
try:
    ws.recv()
except:
    pass

# Execute checks
checks = [
    ('Viewer exists', 'typeof viewer'),
    ('AssetViewer class', 'typeof window.AssetViewer'),
    ('THREE.js', 'typeof THREE !== "undefined" ? THREE.REVISION : "not loaded"'),
]

for name, expression in checks:
    msg_id = name.replace(' ', '_')
    ws.send(json.dumps({
        'id': msg_id,
        'method': 'Runtime.evaluate',
        'params': {'expression': expression, 'returnByValue': True}
    }))

    try:
        result = json.loads(ws.recv())
        value = result.get('result', {}).get('result', {}).get('value')
        print(f"{name}: {value}")
    except:
        print(f"{name}: timeout")

ws.close()
print("\n✅ Done!")
