#!/usr/bin/env python3
"""
Convert Visitor TTF font to WOFF2 format

This script converts a Visitor TTF font file to WOFF2 format for web use.
Visitor font can be downloaded from: https://www.dafont.com/visitor.font

Usage:
    python3 convert-visitor-to-woff2.py [input.ttf] [output.woff2]

If no arguments provided, it will look for fonts/visitor.ttf and create fonts/visitor.woff2
"""

import sys
import os
from pathlib import Path

try:
    from fontTools.ttLib import TTFont
except ImportError:
    print("Error: fonttools is not installed.")
    print("Install it with: pip3 install fonttools[woff]")
    sys.exit(1)


def convert_ttf_to_woff2(input_path, output_path):
    """Convert TTF font to WOFF2 format"""
    try:
        print(f"Reading font file: {input_path}")
        font = TTFont(input_path)
        
        print(f"Converting to WOFF2 format...")
        font.flavor = 'woff2'
        
        print(f"Saving to: {output_path}")
        font.save(output_path)
        
        # Check file size
        size = os.path.getsize(output_path)
        print(f"✓ Successfully converted!")
        print(f"  Output file size: {size:,} bytes ({size / 1024:.1f} KB)")
        return True
        
    except Exception as e:
        print(f"✗ Error converting font: {e}")
        return False


def main():
    # Default paths
    script_dir = Path(__file__).parent
    workspace_dir = script_dir.parent
    fonts_dir = workspace_dir / 'fonts'
    
    if len(sys.argv) >= 3:
        input_path = sys.argv[1]
        output_path = sys.argv[2]
    elif len(sys.argv) == 2:
        input_path = sys.argv[1]
        output_path = str(fonts_dir / 'visitor.woff2')
    else:
        input_path = str(fonts_dir / 'visitor.ttf')
        output_path = str(fonts_dir / 'visitor.woff2')
    
    # Check if input file exists
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        print("\nTo use this script:")
        print("1. Download Visitor font from https://www.dafont.com/visitor.font")
        print("2. Extract the TTF file")
        print("3. Place it in fonts/visitor.ttf or provide the path as an argument")
        print("\nExample:")
        print(f"  python3 {sys.argv[0]} /path/to/visitor.ttf {output_path}")
        sys.exit(1)
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")
    
    # Convert font
    success = convert_ttf_to_woff2(input_path, output_path)
    
    if success:
        print(f"\n✓ Font conversion complete!")
        print(f"  The WOFF2 font is ready to use at: {output_path}")
        print(f"\nThe website will automatically use this font for product names.")
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
