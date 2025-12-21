# Christmas Gift Card Popup - PETRI UI Design

## Overview

A welcome popup has been created that displays Christmas gift card purchase options following the **PETRI UI** design language.

## Features

✅ **PETRI UI Compliant Design**
- Opaque white background (`bg-white`)
- Black borders and text
- Lello (#f0ff00) accents for buttons and hover states
- Visitor font for headers and buttons
- Silka Mono for body text
- 10px base unit spacing system

✅ **Three Gift Card Options**
- $33 Gift Card
- $55 Gift Card
- $77 Gift Card

✅ **Smart Display Logic**
- Only shows in December (month 11)
- Can be dismissed (stored in sessionStorage)
- Shows after landing popup (if it appears)
- Can be manually triggered for testing

## Files Modified

### 1. `index.html`
Added Christmas popup HTML structure:
- Backdrop overlay
- Modal container with PETRI UI styling
- Three gift card option cards
- Close and dismiss buttons

### 2. `styles.css`
Added Christmas popup styles:
- `.christmas-popup-backdrop` - Semi-transparent backdrop
- `.christmas-popup-modal` - Modal container
- `.christmas-popup-container` - White background container (PETRI UI: bg-white)
- `.christmas-card-option` - Individual gift card cards
- `.christmas-card-button` - Lello primary buttons
- Responsive design for mobile

### 3. `script.js`
Added Christmas popup functionality:
- `initializeChristmasPopup()` - Initializes popup on page load
- `showChristmasPopup()` - Shows the popup
- `hideChristmasPopup()` - Hides the popup
- `handleChristmasPurchase()` - Handles gift card purchases
- `handleChristmasDismiss()` - Dismisses popup and stores preference

## Design Specifications

### Colors (PETRI UI)
- **Background**: `#ffffff` (White)
- **Text**: `#000000` (Black)
- **Borders**: `#000000` (Black)
- **Accent**: `#f0ff00` (Lello)
- **Button Text on Lello**: `#303030` (Medium Gray)

### Typography (PETRI UI)
- **Headers**: Visitor font, uppercase, bold
- **Body**: Silka Mono (JetBrains Mono fallback)
- **Sizes**: H1 (37.5px), H3 (15px), Base (11px)

### Spacing (PETRI UI)
- Uses 10px base unit system
- Padding: `var(--space-xlarge)` (30px)
- Gaps: `var(--space-medium)` (13px), `var(--space-large)` (23px)

## Usage

### Automatic Display
The popup automatically shows:
- In December (month 11)
- After page load (with 1 second delay)
- After landing popup closes (if it shows)
- Only if not previously dismissed

### Manual Testing
To manually show the popup (for testing):
```javascript
// In browser console
showChristmasPopupNow();
```

### Dismissal
Users can dismiss the popup by:
- Clicking the X button (top right)
- Clicking "CONTINUE BROWSING" button
- Clicking the backdrop

Dismissal is stored in `sessionStorage` as `christmas_popup_dismissed`.

## Purchase Flow

1. User clicks "PURCHASE" on a gift card option
2. Popup closes
3. Polar checkout modal opens with selected gift card
4. User completes purchase through Polar

The purchase uses the existing `openCheckoutModal()` function and integrates with the Polar checkout system.

## Product Handles

The popup expects these product handles in `polar-products.js`:
- `christmas-gift-card-33`
- `christmas-gift-card-55`
- `christmas-gift-card-77`

These match the handles defined in the gift card JSON metadata files.

## Responsive Design

The popup is fully responsive:
- **Desktop**: 3-column grid for gift cards
- **Mobile**: Single column stack
- Max width: 700px on desktop
- 95% width on mobile

## PETRI UI Compliance Checklist

✅ Opaque white background (`bg-white`)
✅ Black borders (`#000000`)
✅ Lello accents (`#f0ff00`) for buttons and hover
✅ Visitor font for headers and buttons
✅ Silka Mono for body text
✅ Uppercase text transform
✅ 10px base unit spacing
✅ Never Lello text on white (buttons use medium gray text)
✅ Proper hover states with Lello
✅ Clean, minimal design

## Next Steps

1. **Sync Gift Cards to Polar**: Run the sync script to register gift cards with Polar
2. **Update polar-products.js**: Ensure gift card products are included in the mapping
3. **Test**: Use `showChristmasPopupNow()` to test the popup
4. **Verify**: Check that purchases work correctly

## Notes

- The popup only shows in December (can be modified in `shouldShowChristmasPopup()`)
- Dismissal is stored in sessionStorage (clears on browser close)
- The popup respects the landing popup and shows after it closes
- All styling follows PETRI UI design language exactly

---

**Status**: ✅ **Complete and Ready**

The Christmas gift card popup is fully implemented with PETRI UI design and ready for use once gift cards are synced to Polar.

