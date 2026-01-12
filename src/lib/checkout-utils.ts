/**
 * Utility functions for checkout session management
 * 
 * This module provides helper functions for working with checkout sessions,
 * including workarounds for known browser compatibility issues.
 */

// Type-safe globals for cross-platform compatibility
declare const navigator: { userAgent: string; language: string } | undefined;
declare const window: { location: { href: string } } | undefined;

/**
 * Supported language codes for Dodo Payments checkout
 */
export type SupportedLanguage = 
  | 'en' // English
  | 'de' // German
  | 'es' // Spanish
  | 'fr' // French
  | 'it' // Italian
  | 'pt' // Portuguese
  | 'nl' // Dutch
  | 'pl' // Polish
  | 'ja' // Japanese
  | 'zh' // Chinese
  | string; // Allow custom language codes

/**
 * Options for checkout URL modification
 */
export interface CheckoutUrlOptions {
  /**
   * Language code to append to the URL
   */
  language?: SupportedLanguage;
  
  /**
   * Additional query parameters to append
   */
  additionalParams?: Record<string, string>;
  
  /**
   * Whether to preserve existing query parameters
   * @default true
   */
  preserveExisting?: boolean;
}

/**
 * Appends language and other parameters to a checkout URL.
 * 
 * This function is a workaround for issue #178 where Chromium browsers
 * may not respect the force_language setting in iframe overlays.
 * By adding the language as a URL parameter, we ensure it works across
 * all browsers and contexts.
 * 
 * @param checkoutUrl - The checkout URL from the API response
 * @param options - Configuration options
 * @returns Modified checkout URL with parameters
 * 
 * @example
 * ```typescript
 * const session = await client.checkoutSessions.create({ ... });
 * const url = enhanceCheckoutUrl(session.checkout_url, { 
 *   language: 'de' 
 * });
 * // Use url for redirect or iframe
 * ```
 */
export function enhanceCheckoutUrl(
  checkoutUrl: string | null | undefined,
  options: CheckoutUrlOptions = {}
): string | null {
  if (!checkoutUrl) {
    return null;
  }
  
  const {
    language,
    additionalParams = {},
    preserveExisting = true,
  } = options;
  
  try {
    // Use globalThis.URL for universal compatibility
    const URLConstructor = (globalThis as any).URL;
    if (!URLConstructor) {
      return checkoutUrl;
    }
    
    const url = new URLConstructor(checkoutUrl);
    
    // Add language parameter if specified
    if (language) {
      url.searchParams.set('lang', language);
    }
    
    // Add additional parameters
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (preserveExisting || !url.searchParams.has(key)) {
        url.searchParams.set(key, value);
      }
    });
    
    return url.toString();
  } catch (error) {
    // If URL parsing fails, return original
    return checkoutUrl;
  }
}

/**
 * Extracts the language from a checkout URL
 * 
 * @param checkoutUrl - The checkout URL to parse
 * @returns The language code if found, null otherwise
 */
export function extractLanguageFromUrl(checkoutUrl: string): string | null {
  try {
    const URLConstructor = (globalThis as any).URL;
    if (!URLConstructor) {
      return null;
    }
    const url = new URLConstructor(checkoutUrl);
    return url.searchParams.get('lang') || 
           url.searchParams.get('language') || 
           url.searchParams.get('locale');
  } catch {
    return null;
  }
}

/**
 * Validates if a language code is in the correct format
 * 
 * @param language - Language code to validate
 * @returns True if valid (2-letter ISO 639-1 code)
 */
export function isValidLanguageCode(language: string): boolean {
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(language);
}

/**
 * Browser detection utilities for checkout compatibility
 */
export const BrowserUtils = {
  /**
   * Detects if the current browser is Chromium-based
   */
  isChromium(): boolean {
    const nav = (globalThis as any).navigator;
    if (!nav || typeof nav === 'undefined') return false;
    const ua = nav.userAgent.toLowerCase();
    return ua.includes('chrome') || ua.includes('chromium') || ua.includes('edge');
  },
  
  /**
   * Detects if the current browser is Firefox
   */
  isFirefox(): boolean {
    const nav = (globalThis as any).navigator;
    if (!nav || typeof nav === 'undefined') return false;
    return nav.userAgent.toLowerCase().includes('firefox');
  },
  
  /**
   * Checks if the browser is affected by issue #178
   * (Chromium-based browsers with iframe language issues)
   */
  needsLanguageWorkaround(): boolean {
    return this.isChromium();
  },
  
  /**
   * Gets the browser's preferred language
   */
  getPreferredLanguage(): string {
    const nav = (globalThis as any).navigator;
    if (!nav || typeof nav === 'undefined') return 'en';
    return nav.language ? nav.language.split('-')[0] : 'en';
  },
};

/**
 * Checkout redirect helper
 * 
 * @param checkoutUrl - The checkout URL to redirect to
 * @param language - Optional language override
 */
export function redirectToCheckout(
  checkoutUrl: string,
  language?: SupportedLanguage
): void {
  const win = (globalThis as any).window;
  if (!win || typeof win === 'undefined') {
    throw new Error('redirectToCheckout can only be used in browser environment');
  }
  
  const enhancedUrl = enhanceCheckoutUrl(checkoutUrl, language ? { language } : {});
  if (enhancedUrl) {
    win.location.href = enhancedUrl;
  }
}

/**
 * Generates iframe-safe checkout URL with all necessary workarounds
 * 
 * @param checkoutUrl - Original checkout URL
 * @param language - Language code
 * @returns Enhanced URL safe for iframe embedding
 */
export function getIframeSafeCheckoutUrl(
  checkoutUrl: string,
  language?: SupportedLanguage
): string | null {
  const options: CheckoutUrlOptions = {
    additionalParams: {
      // Add any additional parameters needed for iframe context
      embedded: 'true',
    },
  };
  
  if (language) {
    options.language = language;
  }
  
  return enhanceCheckoutUrl(checkoutUrl, options);
}
