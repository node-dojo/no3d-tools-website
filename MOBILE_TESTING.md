# Mobile Testing Guide

This guide helps you test the mobile search bar keyboard handling on real mobile devices.

## Quick Start

1. **Start the mobile testing server:**
   ```bash
   npm run test-mobile
   ```
   Or specify a custom port:
   ```bash
   npm run test-mobile:8000
   ```

2. **Find your local IP address** (displayed in terminal output)

3. **On your mobile device:**
   - Connect to the same Wi-Fi network as your computer
   - Open a browser and navigate to: `http://[YOUR_IP]:3000`
   - Example: `http://192.168.1.100:3000`

## Testing the Mobile Search Bar Keyboard Behavior

### What to Test

1. **Keyboard Appearance:**
   - Tap the search input at the bottom of the screen
   - Verify the search bar smoothly moves above the keyboard
   - The search bar should remain visible and accessible

2. **Keyboard Dismissal:**
   - Tap outside the search input or press "Done" on keyboard
   - Verify the search bar smoothly returns to the bottom
   - No page jumping or unwanted scrolling should occur

3. **Orientation Changes:**
   - Rotate device from portrait to landscape
   - Verify search bar positioning adjusts correctly
   - Test keyboard behavior in both orientations

4. **Different Devices:**
   - Test on iOS Safari (iPhone)
   - Test on Android Chrome
   - Test on different screen sizes

### Expected Behavior

✅ **When keyboard opens:**
- Search bar moves smoothly above keyboard
- Input field remains visible and accessible
- No page scrolling or jumping
- Smooth CSS transitions

✅ **When keyboard closes:**
- Search bar returns to bottom of screen
- Smooth transition back to original position
- No layout shifts or glitches

✅ **Edge cases:**
- Landscape mode works correctly
- Orientation changes handled properly
- Multiple focus/blur events don't cause issues
- Works on both iOS and Android

## Alternative Testing Methods

### Option 1: Browser DevTools (Quick Testing)

1. Open Chrome DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select a mobile device (iPhone, Android)
4. Test keyboard behavior using device emulation

**Note:** DevTools emulation may not perfectly replicate real keyboard behavior. Real device testing is recommended.

### Option 2: Vercel Dev (If Deployed)

If you have the site deployed to Vercel:
1. Use Vercel preview URL
2. Access from mobile device
3. Test keyboard behavior

### Option 3: ngrok (External Access)

For testing from devices outside your network:

```bash
# Install ngrok first: https://ngrok.com/
ngrok http 3000
```

Then use the ngrok URL on your mobile device.

## Troubleshooting

### Can't access from mobile device?

1. **Check firewall:** Ensure port 3000 (or your chosen port) is not blocked
2. **Check network:** Both devices must be on the same Wi-Fi network
3. **Check IP address:** Verify the IP address shown in terminal matches your computer's IP
4. **Try different port:** Use `npm run test-mobile:8000` to use port 8000

### Keyboard not appearing?

- Some mobile browsers require user interaction before showing keyboard
- Make sure you're tapping directly on the input field
- Try refreshing the page

### Search bar not moving?

- Check browser console for JavaScript errors
- Verify Visual Viewport API is supported (modern browsers)
- Test in different browsers (Safari, Chrome)

## Testing Checklist

- [ ] Search bar moves above keyboard when input is focused
- [ ] Search bar returns to bottom when keyboard closes
- [ ] Smooth transitions (no janky movement)
- [ ] No page scrolling when keyboard opens
- [ ] Works in portrait orientation
- [ ] Works in landscape orientation
- [ ] Works on iOS Safari
- [ ] Works on Android Chrome
- [ ] Multiple focus/blur cycles work correctly
- [ ] Orientation changes handled properly

## Notes

- The implementation uses the Visual Viewport API for modern browsers
- Falls back to window resize events for older browsers
- Includes debouncing to prevent excessive updates
- Handles iOS safe area insets automatically

