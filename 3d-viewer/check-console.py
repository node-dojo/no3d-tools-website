#!/usr/bin/env python3
import json
import requests
import websocket
import time

# Get comparison page WebSocket
response = requests.get('http://localhost:9222/json')
pages = response.json()
ws_url = None

for p in pages:
    if p.get('type') == 'page' and 'comparison.html' in p.get('url', ''):
        ws_url = p['webSocketDebuggerUrl']
        print(f"📄 Connected to: {p['title']}")
        print(f"🔗 URL: {p['url']}")
        break

if not ws_url:
    print("❌ comparison.html not found in Chrome tabs")
    exit(1)

# Connect
ws = websocket.create_connection(ws_url)

# Enable Console and Runtime
ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
ws.send(json.dumps({'id': 2, 'method': 'Console.enable'}))
ws.send(json.dumps({'id': 3, 'method': 'Log.enable'}))

# Drain initial messages
ws.settimeout(0.5)
for i in range(10):
    try:
        ws.recv()
    except:
        break

ws.settimeout(2)

print("\n🔍 CHECKING PAGE STATE...\n")

# Check what's loaded
checks = [
    ('Custom viewer exists', 'typeof customViewer'),
    ('AssetViewer class', 'typeof window.AssetViewer'),
    ('THREE.js loaded', 'typeof THREE !== "undefined"'),
    ('model-viewer element', 'document.getElementById("model-viewer-1") !== null'),
    ('File input', 'document.getElementById("file-input") !== null'),
]

for name, js in checks:
    msg_id = int(time.time() * 1000000)
    ws.send(json.dumps({
        'id': msg_id,
        'method': 'Runtime.evaluate',
        'params': {
            'expression': js,
            'returnByValue': True
        }
    }))

    # Get response
    while True:
        try:
            msg = json.loads(ws.recv())
            if msg.get('id') == msg_id:
                result = msg.get('result', {}).get('result', {})
                value = result.get('value', result.get('type', 'unknown'))
                print(f"{name}: {value}")
                break
        except:
            print(f"{name}: timeout")
            break

# Get console messages
print("\n📝 EXECUTING: console.log test...\n")
msg_id = int(time.time() * 1000000)
ws.send(json.dumps({
    'id': msg_id,
    'method': 'Runtime.evaluate',
    'params': {
        'expression': 'console.log("✅ Chrome DevTools connected and working!"); "test complete"',
        'returnByValue': True
    }
}))

# Wait for response
while True:
    try:
        msg = json.loads(ws.recv())
        if msg.get('id') == msg_id:
            print("Console test executed successfully")
            break
    except:
        break

# Try to get viewer status
print("\n🎯 CHECKING VIEWER STATUS...\n")
msg_id = int(time.time() * 1000000)
ws.send(json.dumps({
    'id': msg_id,
    'method': 'Runtime.evaluate',
    'params': {
        'expression': 'document.getElementById("threejs-status").textContent',
        'returnByValue': True
    }
}))

while True:
    try:
        msg = json.loads(ws.recv())
        if msg.get('id') == msg_id:
            status = msg.get('result', {}).get('result', {}).get('value', 'unknown')
            print(f"Three.js viewer status: {status}")
            break
    except:
        print("Could not get viewer status")
        break

ws.close()
print("\n✅ Chrome DevTools check complete!")
