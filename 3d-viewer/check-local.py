#!/usr/bin/env python3
import json
import requests
import websocket

# Get page
response = requests.get('http://localhost:9222/json')
pages = response.json()

for p in pages:
    if p.get('type') == 'page' and 'local-comparison' in p.get('url', ''):
        ws = websocket.create_connection(p['webSocketDebuggerUrl'], timeout=5)

        checks = {
            'THREE.js': 'typeof THREE',
            'THREE version': 'THREE.REVISION',
            'Simple status': 'document.getElementById("simple-status")?.textContent || "not found"',
            'Custom status': 'document.getElementById("custom-status")?.textContent || "not found"',
            'Simple canvas exists': '!!document.querySelector("#simple-container canvas")',
            'Custom canvas exists': '!!document.querySelector("#custom-container canvas")',
        }

        print("🔍 LOCAL COMPARISON PAGE STATUS:\n")

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

            status = "✅" if value not in ["not found", False, "undefined"] else "❌"
            print(f"{status} {name:.<35} {value}")

        print("\n🎯 Testing STL load by clicking first sample button...")
        ws.send(json.dumps({
            'id': 100,
            'method': 'Runtime.evaluate',
            'params': {
                'expression': 'loadSample("Vert_015_20250902_192454.stl"); "Loading..."',
                'returnByValue': True
            }
        }))
        result = json.loads(ws.recv())
        print(f"Load triggered: {result.get('result', {}).get('result', {}).get('value')}")

        ws.close()
        print("\n✅ Check complete! Watch the page to see if the STL loads.")
        break
