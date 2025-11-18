#!/usr/bin/env python3
"""
Debug the 3D viewer using Chrome DevTools Protocol
"""
import json
import requests
import websocket
import sys
import time

def get_page_websocket():
    """Get WebSocket URL for the 3D viewer page"""
    response = requests.get('http://localhost:9222/json')
    pages = response.json()

    for p in pages:
        if p.get('type') == 'page' and '3d-viewer' in p.get('url', ''):
            return p['webSocketDebuggerUrl'], p['title']

    # If not found, use first page
    for p in pages:
        if p.get('type') == 'page':
            return p['webSocketDebuggerUrl'], p['title']

    return None, None

def execute_js(ws, expression):
    """Execute JavaScript in the page"""
    msg_id = int(time.time() * 1000)
    ws.send(json.dumps({
        'id': msg_id,
        'method': 'Runtime.evaluate',
        'params': {
            'expression': expression,
            'returnByValue': True
        }
    }))

    # Wait for response with matching ID
    while True:
        response = json.loads(ws.recv())
        if response.get('id') == msg_id:
            return response
        # Print other messages (console, etc)
        if 'method' in response:
            print(f"📨 {response['method']}")

def main():
    # Get page
    ws_url, title = get_page_websocket()
    if not ws_url:
        print("❌ No Chrome page found")
        sys.exit(1)

    print(f"📄 Connected to: {title}")

    # Connect
    ws = websocket.create_connection(ws_url)

    # Enable domains
    ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
    ws.recv()
    ws.send(json.dumps({'id': 2, 'method': 'Console.enable'}))
    ws.recv()
    ws.send(json.dumps({'id': 3, 'method': 'Log.enable'}))
    ws.recv()

    print("\n🔍 Checking 3D viewer status...\n")

    # Check if viewer is initialized
    result = execute_js(ws, 'typeof viewer !== "undefined" && viewer !== null')
    is_viewer_ready = result.get('result', {}).get('result', {}).get('value', False)
    print(f"Viewer initialized: {is_viewer_ready}")

    # Check if AssetViewer class is available
    result = execute_js(ws, 'typeof window.AssetViewer')
    asset_viewer_type = result.get('result', {}).get('result', {}).get('value', 'undefined')
    print(f"AssetViewer class: {asset_viewer_type}")

    # Check if THREE.js is loaded
    result = execute_js(ws, 'typeof THREE !== "undefined" ? THREE.REVISION : "not loaded"')
    three_version = result.get('result', {}).get('result', {}).get('value', 'not loaded')
    print(f"THREE.js version: {three_version}")

    # Check viewer state if available
    if is_viewer_ready:
        result = execute_js(ws, 'viewer.initialized')
        initialized = result.get('result', {}).get('result', {}).get('value', False)
        print(f"Viewer fully initialized: {initialized}")

        result = execute_js(ws, 'viewer.model !== null')
        has_model = result.get('result', {}).get('result', {}).get('value', False)
        print(f"Has model loaded: {has_model}")

        result = execute_js(ws, 'viewer.isAutoRotating')
        is_rotating = result.get('result', {}).get('result', {}).get('value', False)
        print(f"Auto-rotating: {is_rotating}")

    print("\n✅ Debug complete!")
    ws.close()

if __name__ == '__main__':
    main()
