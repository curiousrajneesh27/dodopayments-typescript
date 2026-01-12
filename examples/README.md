# Dodo Payments Examples

This directory contains example code demonstrating how to use the Dodo Payments TypeScript SDK.

## Examples

### Checkout with Language Support
**File:** [`checkout-with-language.ts`](./checkout-with-language.ts)

Demonstrates how to:
- Create checkout sessions with specific languages
- Handle the Chromium iframe language issue (#178)
- Use the `appendLanguageToCheckoutUrl()` workaround
- Auto-detect user's preferred language
- Create multi-language checkout flows

**Key Features:**
```typescript
// Basic usage
const session = await client.checkoutSessions.create({
  product_cart: [{ product_id: 'prod_123', quantity: 1 }],
  customization: { force_language: 'de' },
});

// Apply workaround for Chromium
const safeUrl = appendLanguageToCheckoutUrl(session.checkout_url, 'de');
```

## Running Examples

```bash
# Install dependencies
npm install

# Run an example
npm run tsn examples/checkout-with-language.ts
```

## Common Issues

### Language Not Working in Overlay (Issue #178)

**Problem:** Language setting is ignored in Chromium-based browsers when using iframe/overlay checkout.

**Solution:** Use the `enhanceCheckoutUrl()` utility:

```typescript
import { enhanceCheckoutUrl } from 'dodopayments/lib/checkout-utils';

const url = enhanceCheckoutUrl(checkoutUrl, { language: 'de' });
```

See the [detailed analysis](../ISSUE_178_ANALYSIS.md) for more information.

## Need Help?

- 📖 [API Documentation](https://docs.dodopayments.com)
- 📦 [SDK Documentation](../api.md)
- 🐛 [Report Issues](https://github.com/dodopayments/dodopayments-typescript/issues)
