/**
 * Example: Creating a checkout session with language customization
 * 
 * This example demonstrates how to properly set up a checkout session with
 * forced language and includes workarounds for the Chromium iframe issue (#178).
 */

import DodoPayments from 'dodopayments';

// Initialize the Dodo Payments client
const client = new DodoPayments({
  bearerToken: (globalThis as any).process?.env?.['DODO_PAYMENTS_API_KEY'] || 'your-api-key-here',
  environment: 'test_mode', // or 'live_mode'
});

/**
 * Create a checkout session with language customization
 */
async function createCheckoutWithLanguage() {
  const checkoutSession = await client.checkoutSessions.create({
    product_cart: [
      {
        product_id: 'prod_123456',
        quantity: 1,
      },
    ],
    customization: {
      // Force the checkout to display in German
      force_language: 'de',
      theme: 'system',
      show_order_details: true,
    },
    customer: {
      email: 'customer@example.com',
      name: 'John Doe',
    },
  });

  return checkoutSession;
}

/**
 * Utility function to append language parameter to checkout URL
 * 
 * WORKAROUND for issue #178: Chromium browsers may not respect the force_language
 * setting in iframe overlays. This function ensures the language is passed as a
 * URL parameter, which works reliably across all browsers.
 * 
 * @param checkoutUrl - The checkout URL from the API response
 * @param language - ISO language code (e.g., 'en', 'de', 'es', 'fr')
 * @returns Modified checkout URL with language parameter
 */
export function appendLanguageToCheckoutUrl(checkoutUrl: string, language: string): string {
  try {
    const URLConstructor = (globalThis as any).URL;
    if (!URLConstructor) {
      return checkoutUrl;
    }
    
    const url = new URLConstructor(checkoutUrl);
    
    // Add language as a query parameter (try multiple parameter names for compatibility)
    url.searchParams.set('lang', language);
    url.searchParams.set('language', language);
    
    return url.toString();
  } catch (error) {
    // Return original URL if parsing fails
    return checkoutUrl;
  }
}

/**
 * Example: Complete checkout flow with language workaround
 */
async function checkoutFlowWithLanguageWorkaround() {
  // Step 1: Create checkout session with desired language
  const session = await createCheckoutWithLanguage();
  
  // Log checkout session creation
  if ((globalThis as any).console) {
    (globalThis as any).console.log('Checkout session created:', session.session_id);
  }
  
  if (!session.checkout_url) {
    throw new Error('No checkout URL returned');
  }
  
  // Step 2: Apply workaround - append language parameter to URL
  const modifiedCheckoutUrl = appendLanguageToCheckoutUrl(session.checkout_url, 'de');
  
  // Log URLs
  if ((globalThis as any).console) {
    (globalThis as any).console.log('Original URL:', session.checkout_url);
    (globalThis as any).console.log('Modified URL:', modifiedCheckoutUrl);
  }
  
  // Step 3: Use the modified URL for checkout
  // For hosted checkout (full redirect):
  // window.location.href = modifiedCheckoutUrl;
  
  // For overlay checkout (if using client-side SDK):
  // DodoPayment?.Checkout.open({ checkoutUrl: modifiedCheckoutUrl });
  
  return {
    sessionId: session.session_id,
    checkoutUrl: modifiedCheckoutUrl,
  };
}

/**
 * Example: Multiple language checkout sessions
 */
async function createMultiLanguageCheckouts() {
  const languages = ['en', 'de', 'es', 'fr', 'it'];
  const sessions: Array<{ language: string; url: string }> = [];
  
  for (const language of languages) {
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: 'prod_123456', quantity: 1 }],
      customization: {
        force_language: language,
      },
    });
    
    if (session.checkout_url) {
      sessions.push({
        language,
        url: appendLanguageToCheckoutUrl(session.checkout_url, language),
      });
    }
  }
  
  return sessions;
}

/**
 * Example: Detect user's preferred language and create checkout
 */
async function createCheckoutWithAutoLanguage(userPreferredLanguage?: string) {
  // Detect language from browser or user preference
  const nav = (globalThis as any).navigator;
  const browserLang = nav && nav.language ? nav.language.split('-')[0] : 'en';
  const language = userPreferredLanguage || browserLang;
  
  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: 'prod_123456', quantity: 1 }],
    customization: {
      force_language: language,
      theme: 'system',
    },
  });
  
  if (session.checkout_url) {
    return appendLanguageToCheckoutUrl(session.checkout_url, language);
  }
  
  return null;
}

// Export utility functions
export {
  createCheckoutWithLanguage,
  checkoutFlowWithLanguageWorkaround,
  createMultiLanguageCheckouts,
  createCheckoutWithAutoLanguage,
};

// Example usage (for Node.js environments)
const isMainModule = (globalThis as any).require && 
                     (globalThis as any).module && 
                     (globalThis as any).require.main === (globalThis as any).module;

if (isMainModule) {
  checkoutFlowWithLanguageWorkaround()
    .then((result) => {
      if ((globalThis as any).console) {
        (globalThis as any).console.log('✅ Checkout ready:', result);
      }
    })
    .catch((error) => {
      if ((globalThis as any).console) {
        (globalThis as any).console.error('❌ Error:', error);
      }
    });
}
