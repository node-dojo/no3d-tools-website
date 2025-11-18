#!/usr/bin/env python3
import json
import requests
import websocket

# Get page
response = requests.get('http://localhost:9222/json')
pages = response.json()

for p in pages:
    if p.get('type') == 'page' and 'simple-test' in p.get('url', ''):
        ws = websocket.create_connection(p['webSocketDebuggerUrl'], timeout=5)

        checks = {
            'meshGroup exists': 'typeof meshGroup',
            'meshGroup value': 'meshGroup',
            'scene.children.length': 'scene.children.length',
            'scene.children types': 'scene.children.map(c => c.type).join(", ")',
            'meshGroup in scene': 'scene.children.includes(meshGroup)',
            'meshGroup.children.length': 'meshGroup ? meshGroup.children.length : "N/A"',
            'meshGroup.children types': 'meshGroup ? meshGroup.children.map(c => c.type).join(", ") : "N/A"',
            'camera.position': '`${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}`',
            'GLTFLoader loaded': 'typeof window.GLTFLoader',
        }

        print("🔍 SCENE INSPECTION:\n")

        for name, expr in checks.items():
            msg_id = list(checks.keys()).index(name) + 1
            ws.send(json.dumps({
                'id': msg_id,
                'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True}
            }))

            response = json.loads(ws.recv())
            result = response.get('result', {}).get('result', {})
            value = result.get('value', result.get('description', result.get('type', 'unknown')))

            status = "✅" if value not in ["undefined", "null", False, 0] else "❌"
            print(f"{status} {name:.<40} {value}")

        # Check for any objects with geometry
        print("\n🔍 Looking for objects with geometry...")
        ws.send(json.dumps({
            'id': 100,
            'method': 'Runtime.evaluate',
            'params': {
                'expression': '''
                let count = 0;
                scene.traverse((obj) => {
                    if (obj.geometry) count++;
                });
                count;
                ''',
                'returnByValue': True
            }
        }))
        result = json.loads(ws.recv())
        geom_count = result.get('result', {}).get('result', {}).get('value', 0)
        print(f"Objects with geometry: {geom_count}")

        ws.close()
        print("\n✅ Inspection complete")
        break
