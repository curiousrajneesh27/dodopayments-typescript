# Issue #178: Language Always English with Overlay Checkout - Analysis & Solution

## Problem Summary

When creating a checkout session with `force_language` set (e.g., `'de'`) and opening it using the overlay checkout method (`DodoPayment?.Checkout.open()`), the language remains English in **Chromium-based browsers** (Chrome, Brave), but works correctly in Firefox and when the checkout URL is opened directly.

## Root Cause

This is a **Chromium-specific cross-origin iframe restriction issue**. When the checkout is embedded in an iframe:

1. **Chromium browsers have stricter security policies** for cross-origin iframes
2. The `force_language` parameter from the checkout session creation may not be properly propagated to the iframe URL
3. Cookie-based or session-based language settings might be blocked by Chromium's cross-origin policies
4. The language dropdown may fail due to restricted JavaScript execution context in cross-origin iframes

## Current Implementation Status

### Server-Side SDK (This Repository)

✅ **CORRECTLY IMPLEMENTED** - The TypeScript SDK properly supports the `force_language` parameter:

```typescript
// src/resources/checkout-sessions.ts (lines 161-169)
export interface Customization {
  /**
   * Force the checkout interface to render in a specific language (e.g. `en`, `es`)
   */
  force_language?: string | null;
  
  show_on_demand_tag?: boolean;
  show_order_details?: boolean;
  theme?: 'dark' | 'light' | 'system';
}
```

**Usage Example:**
```typescript
import DodoPayments from 'dodopayments';

const client = new DodoPayments({
  bearerToken: process.env['DODO_PAYMENTS_API_KEY'],
  environment: 'test_mode',
});

const checkoutSession = await client.checkoutSessions.create({
  product_cart: [{ product_id: 'product_id', quantity: 1 }],
  customization: {
    force_language: 'de',  // ✅ This works correctly
  },
});
```

### Client-Side SDK (NOT in this repository)

❌ **NEEDS TO BE FIXED** - The client-side JavaScript SDK that provides `DodoPayment?.Checkout.open()` needs to be updated.

## Recommended Solution

The client-side checkout SDK needs to explicitly append the language as a URL query parameter when opening the iframe. Here's the recommended implementation:

### Client-Side SDK Fix (pseudocode)

```javascript
// In the client-side SDK (dodo-checkout-sdk.js or similar)

class CheckoutOverlay {
  open({ checkoutUrl, language }) {
    // Parse the checkout URL
    const url = new URL(checkoutUrl);
    
    // CRITICAL FIX: Append language parameter to URL
    // This ensures Chromium can access it even with cross-origin restrictions
    if (language) {
      url.searchParams.set('lang', language);
      // Alternative parameter names that might be used:
      // url.searchParams.set('language', language);
      // url.searchParams.set('locale', language);
    }
    
    // Create iframe with proper security attributes
    const iframe = document.createElement('iframe');
    iframe.src = url.toString();  // Use modified URL
    iframe.setAttribute('allow', 'payment');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
    iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
    
    // Add to overlay container
    const overlay = document.createElement('div');
    overlay.className = 'dodo-checkout-overlay';
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);
  }
}
```

### Server-Side: Ensure URL Parameter Support

The backend checkout page should read the language from the URL parameter:

```javascript
// In the checkout page (server-side rendering or client-side)
const urlParams = new URLSearchParams(window.location.search);
const language = urlParams.get('lang') || 
                 urlParams.get('language') || 
                 urlParams.get('locale') ||
                 defaultLanguage;

// Set the language immediately on page load
setLanguage(language);
```

## Workarounds for Users (Until Fix is Released)

### Option 1: Use Hosted Checkout (Full Redirect)

Instead of overlay, redirect to the checkout page:

```javascript
// ❌ Don't use overlay (broken in Chromium):
// DodoPayment?.Checkout.open({ checkoutUrl: res.result.checkoutUrl });

// ✅ Use full redirect:
window.location.href = res.result.checkoutUrl;
```

### Option 2: Manually Append Language Parameter

If you must use the overlay, manually add the language parameter:

```javascript
// Get the checkout URL from the API response
const checkoutUrl = res.result.checkoutUrl;

// Extract the language from your checkout session config
const language = 'de'; // or whatever you set in force_language

// Append language to URL
const url = new URL(checkoutUrl);
url.searchParams.set('lang', language);

// Now open with modified URL
DodoPayment?.Checkout.open({ checkoutUrl: url.toString() });
```

### Option 3: Use Firefox Temporarily

Firefox handles cross-origin iframe restrictions differently and the current implementation works there.

## Testing Checklist

After implementing the fix, test:

- [ ] Chromium browsers (Chrome, Brave, Edge)
- [ ] Firefox
- [ ] Safari
- [ ] Language dropdown functionality in overlay
- [ ] Direct language setting via `force_language`
- [ ] Hosted checkout (should still work)
- [ ] Various language codes: `en`, `de`, `es`, `fr`, etc.

## Technical Details

### Why This Happens in Chromium

1. **Cookie Restrictions**: Chromium blocks third-party cookies in iframes by default
2. **LocalStorage Restrictions**: Cross-origin iframes have limited localStorage access
3. **URL Parameters Are Reliable**: URL parameters are always accessible and not affected by cross-origin policies

### Why Firefox Works

Firefox has slightly more permissive policies for same-site iframes and handles session data differently.

### Why Direct URL Works

When opening the URL directly (not in an iframe), there are no cross-origin restrictions, so cookie/session-based language detection works.

## Related GitHub Issues

- Issue #178: Language always english with overlay checkout
- PR #184: Fix/checkout language chromium issue (referenced but not in this repo)
- Commit 7ef8bdc: "fix: Add language parameter workaround for Chromium iframe issue" (not in this repo)

## Repository Scope

**Important**: This TypeScript repository (`dodopayments-typescript`) contains only the **server-side API SDK**. The actual fix needs to be implemented in the **client-side JavaScript SDK** that provides the overlay checkout functionality.

## Contact

If you're implementing the fix and need clarification on the API behavior, refer to:
- API Documentation: https://docs.dodopayments.com
- This SDK Documentation: See `api.md` and `README.md`
