# Polar Checkout Flow Options

This document outlines all available checkout integration options from Polar SDK.

## Overview

Polar offers three main approaches for checkout integration:

1. **Embedded Checkout Modal** ⭐ (Recommended)
2. **Checkout Links** (Current Implementation)
3. **Custom Shopping Cart + Checkout Sessions**

---

## Option 1: Embedded Checkout Modal ⭐

**Best for**: Keeping users on your site with a seamless experience

### Features
- ✅ Opens as a modal overlay on your website
- ✅ No redirect - users stay on your page
- ✅ Fully styled and managed by Polar
- ✅ Supports light/dark themes
- ✅ Event listeners for checkout completion

### Installation

```bash
npm install @polar-sh/checkout
```

### Implementation

```javascript
import { PolarEmbedCheckout } from "@polar-sh/checkout/embed";

/**
 * Open Polar checkout in a modal overlay
 * @param {string} checkoutLinkId - The checkout link ID (e.g., "polar_cl_...")
 * @param {string} theme - "light" or "dark"
 */
async function openCheckoutModal(checkoutLinkId, theme = "light") {
  try {
    // Extract just the checkout link ID if full URL provided
    const linkId = checkoutLinkId.includes('polar_cl_')
      ? checkoutLinkId.split('polar_cl_')[1]?.split('/')[0] || checkoutLinkId
      : checkoutLinkId;
    
    // Create the checkout iframe (opens as modal)
    const checkout = await PolarEmbedCheckout.create(linkId, theme);
    
    // Optional: Listen for checkout events
    checkout.on('close', () => {
      console.log('Checkout modal closed');
      // Handle post-checkout actions (e.g., show success message, refresh data)
      handleCheckoutClose();
    });
    
    checkout.on('success', (data) => {
      console.log('Checkout successful', data);
      // Handle successful purchase
      handleCheckoutSuccess(data);
    });
    
    return checkout;
  } catch (error) {
    console.error("Failed to open checkout", error);
    // Fallback to redirect if modal fails
    window.location.href = `https://buy.polar.sh/${checkoutLinkId}`;
  }
}

/**
 * Extract checkout link ID from full URL
 */
function getCheckoutLinkId(checkoutUrl) {
  if (checkoutUrl.includes('polar_cl_')) {
    return checkoutUrl.split('polar_cl_')[1];
  }
  return checkoutUrl;
}

/**
 * Integration with existing product data
 */
function initializeCheckoutButtons() {
  // Find all checkout buttons
  document.querySelectorAll('[data-checkout-link]').forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      const checkoutUrl = button.dataset.checkoutLink;
      const checkoutLinkId = getCheckoutLinkId(checkoutUrl);
      
      await openCheckoutModal(checkoutLinkId);
    });
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeCheckoutButtons);
```

### HTML Integration

```html
<!-- Replace existing buy buttons with data attribute -->
<button 
  class="buy-button" 
  data-checkout-link="https://buy.polar.sh/polar_cl_Mdyq6kqdr2RdnFYR3Qb8x6T1MC4dysUF5miZu1zdLCZ"
>
  Buy Now
</button>
```

### With Your Current Setup

Update `no3d-tools-website/script.js`:

```javascript
// Add after Polar products are loaded
function setupPolarCheckout() {
  if (typeof POLAR_PRODUCTS === 'undefined') return;
  
  Object.entries(POLAR_PRODUCTS).forEach(([productId, product]) => {
    const buyButton = document.querySelector(`[data-product-id="${productId}"]`);
    if (buyButton && product.url) {
      buyButton.addEventListener('click', async (e) => {
        e.preventDefault();
        await openCheckoutModal(getCheckoutLinkId(product.url));
      });
    }
  });
}
```

---

## Option 2: Checkout Links (Current Implementation)

**Best for**: Simple redirect-based checkout

### Current Setup

You're already using this approach. Checkout links redirect users to `https://buy.polar.sh/polar_cl_...`

### Pros
- ✅ Simple to implement
- ✅ No additional dependencies
- ✅ Fully managed by Polar

### Cons
- ❌ Users leave your site
- ❌ Less control over user experience

### Usage

```html
<a href="https://buy.polar.sh/polar_cl_Mdyq6kqdr2RdnFYR3Qb8x6T1MC4dysUF5miZu1zdLCZ">
  Buy Now
</a>
```

---

## Option 3: Custom Shopping Cart + Checkout Sessions

**Best for**: Building a custom cart experience

### Features
- ✅ Full control over cart UI
- ✅ Add multiple products before checkout
- ✅ Custom cart logic and calculations

### Implementation

```javascript
import { Polar } from '@polar-sh/sdk';
import { PolarEmbedCheckout } from "@polar-sh/checkout/embed";

const polar = new Polar({ accessToken: POLAR_API_TOKEN });

// Shopping cart state
const cart = {
  items: [],
  add(productId) {
    if (!this.items.includes(productId)) {
      this.items.push(productId);
    }
  },
  remove(productId) {
    this.items = this.items.filter(id => id !== productId);
  },
  clear() {
    this.items = [];
  }
};

/**
 * Create a dynamic checkout session for cart items
 */
async function checkoutCart() {
  if (cart.items.length === 0) {
    alert('Your cart is empty');
    return;
  }
  
  try {
    // Create checkout link with all cart items
    const checkoutLink = await polar.checkoutLinks.create({
      productIds: cart.items, // Array of product IDs
      paymentProcessor: 'stripe',
      label: `Cart with ${cart.items.length} items`,
      successUrl: window.location.origin + '/success',
      metadata: {
        source: 'custom_cart',
        itemCount: cart.items.length
      }
    });
    
    // Open embedded checkout with new session
    const checkout = await PolarEmbedCheckout.create(
      checkoutLink.clientSecret || checkoutLink.id, 
      'light'
    );
    
    // Clear cart after checkout opens
    checkout.on('success', () => {
      cart.clear();
      updateCartUI();
    });
    
  } catch (error) {
    console.error('Failed to create checkout session', error);
    alert('Unable to process checkout. Please try again.');
  }
}

/**
 * Update cart UI
 */
function updateCartUI() {
  const cartCount = document.getElementById('cart-count');
  const cartTotal = document.getElementById('cart-total');
  
  if (cartCount) {
    cartCount.textContent = cart.items.length;
  }
  
  // Calculate total price (requires product price data)
  // const total = calculateCartTotal();
  // if (cartTotal) cartTotal.textContent = formatPrice(total);
}

// Example: Add to cart button
document.querySelectorAll('[data-add-to-cart]').forEach(button => {
  button.addEventListener('click', () => {
    const productId = button.dataset.addToCart;
    cart.add(productId);
    updateCartUI();
  });
});

// Example: Checkout button
document.getElementById('checkout-button')?.addEventListener('click', checkoutCart);
```

### Shopping Cart HTML Example

```html
<div class="shopping-cart">
  <div class="cart-header">
    <h3>Shopping Cart</h3>
    <span id="cart-count">0</span> items
  </div>
  <div class="cart-items" id="cart-items">
    <!-- Dynamically populated -->
  </div>
  <div class="cart-footer">
    <div class="cart-total">
      Total: <span id="cart-total">$0.00</span>
    </div>
    <button id="checkout-button" class="checkout-btn">
      Proceed to Checkout
    </button>
  </div>
</div>
```

---

## Comparison Table

| Feature | Embedded Modal | Checkout Links | Custom Cart |
|---------|---------------|----------------|-------------|
| User stays on site | ✅ Yes | ❌ No | ✅ Yes |
| Multiple products | ⚠️ Requires session | ❌ Single product | ✅ Yes |
| Customization | ⚠️ Limited | ❌ None | ✅ Full control |
| Implementation | 🟢 Easy | 🟢 Very Easy | 🟡 Medium |
| Dependencies | `@polar-sh/checkout` | None | `@polar-sh/sdk` + `@polar-sh/checkout` |

---

## Recommendation

For your use case, I recommend **Option 1: Embedded Checkout Modal**:

1. ✅ Users stay on your website
2. ✅ Better user experience
3. ✅ Minimal code changes required
4. ✅ Works with your existing checkout links
5. ✅ Easy to add shopping cart later if needed

### Migration Steps

1. Install package: `npm install @polar-sh/checkout`
2. Update `index.html` to load the checkout module
3. Modify existing buy buttons to use embedded checkout
4. Test with a single product first
5. Roll out to all products

---

## Resources

- [Polar Embedded Checkout Docs](https://polar.sh/docs/features/checkout/embed)
- [Polar Checkout Links API](https://polar.sh/docs/api-reference/checkout-links/create)
- [Polar Checkout Sessions](https://polar.sh/docs/features/checkout/session)
- [Polar SDK Reference](https://polar.sh/docs/api-reference)

