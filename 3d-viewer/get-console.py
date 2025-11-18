#!/usr/bin/env python3
import json
import requests
import websocket

# Get page
response = requests.get('http://localhost:9222/json')
pages = response.json()
ws_url = None

for p in pages:
    if p.get('type') == 'page' and 'comparison' in p.get('url', ''):
        ws_url = p['webSocketDebuggerUrl']
        print(f"Connected to: {p['url']}\n")
        break

if not ws_url:
    print("Page not found")
    exit(1)

ws = websocket.create_connection(ws_url)
ws.settimeout(0.1)

# Enable console
ws.send(json.dumps({'id': 1, 'method': 'Console.enable'}))
ws.send(json.dumps({'id': 2, 'method': 'Runtime.enable'}))

print("Listening for messages (10 seconds)...\n")

import time
start = time.time()
messages = []

while time.time() - start < 10:
    try:
        msg = ws.recv()
        data = json.loads(msg)

        # Print any method calls we receive
        if 'method' in data:
            method = data['method']
            if 'Console' in method or 'Log' in method:
                print(f"📝 {method}")
                params = data.get('params', {})
                if 'args' in params:
                    for arg in params['args']:
                        print(f"   {arg.get('value', arg.get('description', arg))}")
                print()
            elif method not in ['Runtime.executionContextCreated', 'Runtime.executionContextsCleared']:
                print(f"📨 {method}")

        messages.append(data)
    except:
        time.sleep(0.1)

ws.close()

print(f"\n✅ Captured {len(messages)} messages")
print("\nTo see all messages, they are in the messages list")
