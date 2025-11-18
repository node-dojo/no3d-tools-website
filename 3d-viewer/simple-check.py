#!/usr/bin/env python3
import json
import requests
import websocket

response = requests.get('http://localhost:9222/json')
pages = response.json()

for p in pages:
    if p.get('type') == 'page' and 'simple-test' in p.get('url', ''):
        ws = websocket.create_connection(p['webSocketDebuggerUrl'], timeout=3)

        # Simple checks
        checks = [
            ('GLTFLoader', 'typeof window.GLTFLoader'),
            ('Scene children', 'scene.children.length'),
            ('Has geometry', 'let c=0; scene.traverse(o=>{if(o.geometry)c++}); c'),
        ]

        print("🔍 Quick Status Check:\n")
        for i, (name, expr) in enumerate(checks):
            ws.send(json.dumps({
                'id': i+1,
                'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True}
            }))

            try:
                resp = json.loads(ws.recv())
                val = resp.get('result', {}).get('result', {}).get('value', 'error')
                print(f"{name}: {val}")
            except:
                print(f"{name}: timeout")

        ws.close()
        break
