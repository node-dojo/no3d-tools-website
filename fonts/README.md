# Visitor Font Setup

This directory should contain `visitor.woff2` for the website to use Visitor font.

## To set up Visitor font:

1. Download Visitor font from: https://www.dafont.com/visitor.font
2. Extract the ZIP file
3. Run the conversion script:
   ```bash
   python3 ../scripts/convert-visitor-to-woff2.py visitor.ttf visitor.woff2
   ```

Or if you place visitor.ttf in this directory:
   ```bash
   python3 ../scripts/convert-visitor-to-woff2.py
   ```

The website is already configured to use visitor.woff2 once it's created.
