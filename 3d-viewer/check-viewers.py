#!/usr/bin/env python3
import json
import requests
import websocket

# Get page
response = requests.get('http://localhost:9222/json')
pages = response.json()

for p in pages:
    if p.get('type') == 'page' and 'comparison' in p.get('url', ''):
        ws = websocket.create_connection(p['webSocketDebuggerUrl'], timeout=5)

        checks = {
            'THREE.js loaded': 'typeof THREE',
            'THREE version': 'typeof THREE !== "undefined" ? THREE.REVISION : "not loaded"',
            'AssetViewer class': 'typeof AssetViewer',
            'customViewer variable': 'typeof customViewer',
            'model-viewer element exists': '!!document.getElementById("model-viewer-1")',
            'threejs-status text': 'document.getElementById("threejs-status")?.textContent || "element not found"',
            'Page title': 'document.title',
        }

        print("🔍 PAGE INSPECTION RESULTS:\n")

        for name, expr in checks.items():
            msg_id = list(checks.keys()).index(name) + 1
            ws.send(json.dumps({
                'id': msg_id,
                'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True}
            }))

            response = json.loads(ws.recv())
            result = response.get('result', {}).get('result', {})
            value = result.get('value', result.get('type', 'unknown'))

            print(f"{name:.<40} {value}")

        ws.close()
        break
