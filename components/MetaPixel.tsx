"use client";
import { useEffect, useState } from 'react';
import { META_CONSENT_KEY, setMetaConsent, trackMeta } from '../lib/meta-pixel';
type Choice = 'accepted' | 'rejected' | null;
export default function MetaPixel() {
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState<Choice>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let saved: Choice = null;
    try { const value = localStorage.getItem(META_CONSENT_KEY); if (value === 'accepted' || value === 'rejected') saved = value; } catch {}
    setChoice(saved); setOpen(saved === null); setReady(true); setMetaConsent(saved === 'accepted');
    function onClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!link || new URL(link.href, location.href).hostname !== 'wa.me') return;
      // Do not transmit the WhatsApp message, phone number, size or color.
      trackMeta('Contact', { contact_method: 'WhatsApp' });
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  function choose(value: Exclude<Choice, null>) {
    try { localStorage.setItem(META_CONSENT_KEY, value); } catch {}
    setChoice(value); setOpen(false); setMetaConsent(value === 'accepted');
  }
  if (!ready) return null;
  return <><div className="privacy-links"><a href="/privacidad">Privacidad</a><button type="button" onClick={() => setOpen(true)}>Preferencias de cookies</button></div>{open && <section className="cookie-banner" aria-label="Preferencias de medición publicitaria"><div><strong>Tu privacidad</strong><p>Con tu permiso, usamos Meta Pixel para medir visitas, vistas de prendas y clics en WhatsApp, y mejorar nuestros anuncios. Puedes comprar y consultar sin aceptarlo. <a href="/privacidad">Más información</a>.</p></div><div className="cookie-actions"><button type="button" onClick={() => choose('rejected')}>Rechazar</button><button type="button" onClick={() => choose('accepted')}>Aceptar</button>{choice !== null && <button type="button" onClick={() => setOpen(false)}>Cerrar</button>}</div></section>}</>;
}
