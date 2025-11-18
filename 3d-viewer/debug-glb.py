#!/usr/bin/env python3
import json
import requests
import websocket
import time

# Get page
response = requests.get('http://localhost:9222/json')
pages = response.json()

for p in pages:
    if p.get('type') == 'page' and 'simple-test' in p.get('url', ''):
        print(f"Connected to: {p['url']}\n")
        ws = websocket.create_connection(p['webSocketDebuggerUrl'], timeout=10)

        # Enable console
        ws.send(json.dumps({'id': 1, 'method': 'Console.enable'}))
        ws.send(json.dumps({'id': 2, 'method': 'Log.enable'}))
        ws.send(json.dumps({'id': 3, 'method': 'Runtime.enable'}))

        print("🔍 CHECKING GLTF LOADER STATUS...\n")

        checks = {
            'GLTFLoader available': 'typeof window.GLTFLoader',
            'gltfLoaderReady flag': 'window.gltfLoaderReady',
            'meshGroup': 'typeof meshGroup',
            'meshGroup value': 'meshGroup ? "exists" : "null"',
            'scene children count': 'scene.children.length',
            'Geometry in scene': '''
                let count = 0;
                scene.traverse((obj) => { if (obj.geometry) count++; });
                count;
            ''',
        }

        for name, expr in checks.items():
            msg_id = 10 + list(checks.keys()).index(name)
            ws.send(json.dumps({
                'id': msg_id,
                'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True}
            }))

            response = json.loads(ws.recv())
            result = response.get('result', {}).get('result', {})
            value = result.get('value', result.get('type', 'unknown'))

            status = "✅" if value not in ["undefined", "null", False, 0] else "❌"
            print(f"{status} {name:.<40} {value}")

        print("\n📝 RECENT CONSOLE MESSAGES:\n")

        # Get console messages
        ws.send(json.dumps({
            'id': 100,
            'method': 'Runtime.evaluate',
            'params': {
                'expression': '''
                    // Return last few console logs
                    "Check console history..."
                ''',
                'returnByValue': True
            }
        }))
        ws.recv()

        print("\n🎯 TRIGGERING TEST GLB LOAD (if you have one loaded)...\n")

        # Check if a model is loaded
        ws.send(json.dumps({
            'id': 101,
            'method': 'Runtime.evaluate',
            'params': {
                'expression': '''
                    if (meshGroup) {
                        const info = {
                            inScene: scene.children.includes(meshGroup),
                            childrenCount: meshGroup.children.length,
                            hasGeometry: false
                        };
                        meshGroup.traverse((obj) => {
                            if (obj.geometry) info.hasGeometry = true;
                        });
                        JSON.stringify(info);
                    } else {
                        "No meshGroup loaded"
                    }
                ''',
                'returnByValue': True
            }
        }))

        response = json.loads(ws.recv())
        result = response.get('result', {}).get('result', {})
        value = result.get('value', 'unknown')
        print(f"MeshGroup Status: {value}")

        print("\n⏳ Listening for console messages for 3 seconds...\n")

        ws.settimeout(0.5)
        start = time.time()
        while time.time() - start < 3:
            try:
                msg = ws.recv()
                data = json.loads(msg)
                method = data.get('method', '')

                if 'Console.messageAdded' in method:
                    params = data.get('params', {})
                    message = params.get('message', {})
                    level = message.get('level', 'log')
                    text = message.get('text', '')

                    if level == 'error':
                        print(f"❌ ERROR: {text}")
                    elif level == 'warning':
                        print(f"⚠️  WARNING: {text}")
                    elif 'GLTF' in text or 'GLB' in text or '✅' in text or '❌' in text:
                        print(f"📝 {text}")

            except:
                continue

        ws.close()
        print("\n✅ Debug complete")
        break
