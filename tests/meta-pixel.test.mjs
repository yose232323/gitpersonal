import test from 'node:test';
import assert from 'node:assert/strict';
import { setMetaConsent, trackMeta, META_PIXEL_ID } from '../lib/meta-pixel.ts';
test('loads pixel only on acceptance, suppresses events after rejection and avoids duplicate initialization',()=>{
 const scripts=[];
 globalThis.window={};globalThis.document={getElementById:id=>scripts.find(s=>s.id===id),createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}};
 trackMeta('Contact');assert.equal(window.fbq,undefined);assert.equal(scripts.length,0);
 setMetaConsent(false);assert.equal(scripts.length,0);
 setMetaConsent(true);assert.equal(scripts.length,1);assert.equal(scripts[0].src,'https://connect.facebook.net/en_US/fbevents.js');
 assert.deepEqual(window.fbq.queue.filter(r=>r[0]==='init'),[['init',META_PIXEL_ID]]);
 trackMeta('ViewContent',{content_ids:['product-1'],currency:'CRC',value:25000});
 trackMeta('Contact',{contact_method:'WhatsApp'});
 assert.equal(window.fbq.queue.filter(r=>r[1]==='Contact').length,1);
 setMetaConsent(false);const count=window.fbq.queue.length;trackMeta('Contact');assert.equal(window.fbq.queue.length,count);
 setMetaConsent(true);assert.equal(scripts.length,1);assert.equal(window.fbq.queue.filter(r=>r[0]==='init').length,1);assert.equal(window.fbq.queue.filter(r=>r[1]==='PageView').length,1);
 delete globalThis.window;delete globalThis.document;
});
