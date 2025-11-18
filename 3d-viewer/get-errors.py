#!/usr/bin/env python3
import json
import requests
import websocket
import time

# Get page
response = requests.get('http://localhost:9222/json')
pages = response.json()

for p in pages:
    if p.get('type') == 'page' and 'local-comparison' in p.get('url', ''):
        print(f"Connected to: {p['url']}\n")
        ws = websocket.create_connection(p['webSocketDebuggerUrl'], timeout=10)

        # Enable console and log
        ws.send(json.dumps({'id': 1, 'method': 'Console.enable'}))
        ws.send(json.dumps({'id': 2, 'method': 'Log.enable'}))
        ws.send(json.dumps({'id': 3, 'method': 'Runtime.enable'}))

        ws.settimeout(0.5)

        print("📝 LISTENING FOR CONSOLE MESSAGES...\n")

        # Listen for messages
        start = time.time()
        while time.time() - start < 5:
            try:
                msg = ws.recv()
                data = json.loads(msg)

                method = data.get('method', '')

                # Console messages
                if 'Console.messageAdded' in method:
                    params = data.get('params', {})
                    message = params.get('message', {})
                    level = message.get('level', 'log')
                    text = message.get('text', '')

                    if level == 'error':
                        print(f"❌ ERROR: {text}")
                    elif level == 'warning':
                        print(f"⚠️  WARNING: {text}")
                    else:
                        print(f"📝 {text}")

                # Runtime exceptions
                elif 'Runtime.exceptionThrown' in method:
                    params = data.get('params', {})
                    exception = params.get('exceptionDetails', {})
                    ex_text = exception.get('text', '')
                    ex_exception = exception.get('exception', {})
                    ex_desc = ex_exception.get('description', '')

                    print(f"\n❌ EXCEPTION: {ex_text}")
                    if ex_desc:
                        print(f"   {ex_desc}\n")

                # Log entries
                elif 'Log.entryAdded' in method:
                    params = data.get('params', {})
                    entry = params.get('entry', {})
                    level = entry.get('level', 'log')
                    text = entry.get('text', '')

                    if level == 'error':
                        print(f"❌ LOG ERROR: {text}")
                    elif level == 'warning':
                        print(f"⚠️  LOG WARNING: {text}")

            except Exception as e:
                time.sleep(0.1)
                continue

        print("\n✅ Done listening")
        ws.close()
        break
