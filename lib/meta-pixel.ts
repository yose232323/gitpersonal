export const META_PIXEL_ID = '1802830344259046';
export const META_CONSENT_KEY = 'alma-latina-marketing-consent-v1';
type PixelEvent = 'PageView' | 'ViewContent' | 'Contact';
type PixelFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push?: PixelFunction;
  loaded: boolean;
  version: string;
};
declare global { interface Window { fbq?: PixelFunction; _fbq?: PixelFunction; } }
let permitted = false;
let initialized = false;
let pageTracked = false;
export function setMetaConsent(accepted: boolean) {
  if (typeof window === 'undefined') return;
  permitted = accepted;
  if (!accepted) { window.fbq?.('consent', 'revoke'); return; }
  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args); else fbq.queue.push(args);
    } as PixelFunction;
    fbq.queue = []; fbq.loaded = true; fbq.version = '2.0'; fbq.push = fbq;
    window.fbq = fbq; window._fbq = fbq;
  }
  window.fbq('consent', 'grant');
  if (!initialized) { window.fbq('init', META_PIXEL_ID); initialized = true; }
  if (!document.getElementById('alma-meta-pixel')) {
    const script = document.createElement('script');
    script.id = 'alma-meta-pixel'; script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  if (!pageTracked) { trackMeta('PageView'); pageTracked = true; }
}
export function trackMeta(event: PixelEvent, data?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !permitted) return;
  window.fbq?.('track', event, data ?? {});
}
