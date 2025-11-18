#!/usr/bin/env python3
import json
import requests
import websocket
import time

# Get page
response = requests.get('http://localhost:9222/json')
pages = response.json()

for p in pages:
    if p.get('type') == 'page' and 'comparison' in p.get('url', ''):
        ws_url = p['webSocketDebuggerUrl']
        print(f"Inspecting: {p['url']}\n")

        ws = websocket.create_connection(ws_url, timeout=5)

        # Simple synchronous check
        print("Sending Runtime.evaluate...")
        ws.send(json.dumps({
            'id': 999,
            'method': 'Runtime.evaluate',
            'params': {
                'expression': '2 + 2',
                'returnByValue': True
            }
        }))

        print("Waiting for response...")
        response = ws.recv()
        print(f"Response: {response}\n")

        # Try to get page errors
        ws.send(json.dumps({
            'id': 1000,
            'method': 'Runtime.evaluate',
            'params': {
                'expression': 'window.onerror ? "Has error handler" : "No error handler"',
                'returnByValue': True
            }
        }))

        response = ws.recv()
        print(f"Error handler check: {response}\n")

        ws.close()
        break
