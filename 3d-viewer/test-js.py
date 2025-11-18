#!/usr/bin/env python3
import json
import requests
import websocket

# Get page
response = requests.get('http://localhost:9222/json')
pages = response.json()
ws_url = pages[0]['webSocketDebuggerUrl']
print(f"Connecting to: {pages[0]['title']}")

ws = websocket.create_connection(ws_url)
ws.settimeout(2)

# Enable Runtime
ws.send(json.dumps({'id': 999, 'method': 'Runtime.enable'}))
print(ws.recv())

# Simple test
ws.send(json.dumps({
    'id': 1,
    'method': 'Runtime.evaluate',
    'params': {'expression': '1 + 1'}
}))
print("\nResponse:")
print(json.dumps(json.loads(ws.recv()), indent=2))

ws.close()
