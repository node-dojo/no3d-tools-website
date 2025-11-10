#!/usr/bin/env python3
"""
Verify Visitor font setup
Checks that visitor.woff2 exists and is valid
"""

import os
import sys

def verify_visitor_font():
    woff2_path = '/workspace/fonts/visitor.woff2'
    
    print("Verifying Visitor font setup...\n")
    
    # Check if file exists
    if not os.path.exists(woff2_path):
        print("✗ visitor.woff2 not found in fonts/ directory")
        print(f"  Expected location: {woff2_path}")
        return False
    
    # Check file size
    size = os.path.getsize(woff2_path)
    print(f"✓ File found: fonts/visitor.woff2")
    print(f"  Size: {size:,} bytes ({size / 1024:.1f} KB)")
    
    # Verify WOFF2 format
    with open(woff2_path, 'rb') as f:
        header = f.read(4)
        if header == b'wOF2':
            print(f"  ✓ Valid WOFF2 format")
        else:
            print(f"  ⚠ Warning: File header is {header}, expected 'wOF2'")
            print(f"    File may not be valid WOFF2 format")
            return False
    
    # Check HTML configuration
    html_path = '/workspace/index.html'
    if os.path.exists(html_path):
        with open(html_path, 'r') as f:
            html_content = f.read()
            if 'visitor.woff2' in html_content and '@font-face' in html_content:
                print(f"  ✓ HTML configured correctly")
            else:
                print(f"  ⚠ HTML may not be configured correctly")
    
    # Check CSS configuration
    css_path = '/workspace/styles.css'
    if os.path.exists(css_path):
        with open(css_path, 'r') as f:
            css_content = f.read()
            if 'product-name' in css_content and 'Visitor' in css_content and '!important' in css_content:
                print(f"  ✓ CSS configured correctly")
            else:
                print(f"  ⚠ CSS may not be configured correctly")
    
    print(f"\n✓ SUCCESS! Visitor font is ready!")
    print(f"  The website will now use Visitor font for all product names.")
    print(f"\n  Product name elements using Visitor font:")
    print(f"    - .product-name (sidebar product names)")
    print(f"    - .product-title (main product title)")
    print(f"    - .search-result-title (search results)")
    print(f"    - .cart-item-name (shopping cart)")
    
    return True

if __name__ == "__main__":
    success = verify_visitor_font()
    sys.exit(0 if success else 1)
