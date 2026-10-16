import { createHash } from 'node:crypto';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export function planImages(catalog, cloudName) {
  if (!/^[a-z0-9_-]+$/i.test(cloudName)) throw new Error('Cloud name no válido');
  const images = new Map();
  for (const product of catalog.products) for (const source of product.images) {
    const url = new URL(source);
    if (url.protocol !== 'https:' || url.hostname !== 'd1b50uin55dq3m.cloudfront.net') throw new Error('Origen de foto no permitido');
    const filename = url.pathname.split('/').at(-1);
    const id = createHash('sha256').update(`${cloudName}:${filename}`).digest('hex');
    if (!images.has(id)) images.set(id, { source, publicId: `alma-latina/catalog/${id}`, key: id });
  }
  return [...images.values()];
}
export function signature(params, secret) {
  return createHash('sha1').update(Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + secret).digest('hex');
}
export async function atomicJSON(path, data) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  await writeFile(temp, JSON.stringify(data, null, 2) + '\n');
  await rename(temp, path);
}
export async function verify(url, fetcher = fetch, pause = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
        await response.body?.cancel();
        throw new Error('Respuesta de imagen no válida');
      }
      const bytes = await response.arrayBuffer();
      if (!bytes.byteLength) throw new Error('Imagen vacía');
      return;
    } catch {
      if (attempt === 2) throw new Error('No se pudo verificar la fotografía tras 3 intentos. Revisa la conexión o la imagen en Cloudinary.');
      await pause(1000 * (attempt + 1));
    }
  }
}
export async function verifySavedImages(records, verifyImage = verify, report = console.log) {
  let next = 0, completed = 0;
  const failures = [];
  report(`Comprobando ${records.length} copias guardadas (4 conexiones como máximo)…`);
  await Promise.all(Array.from({ length: Math.min(4, records.length) }, async () => {
    while (next < records.length) {
      const record = records[next++];
      try { await verifyImage(record.url); }
      catch { failures.push(record.publicId); report(`No se pudo verificar: ${record.publicId}`); }
      completed++;
      if (completed % 25 === 0 || completed === records.length) report(`Fotos revisadas: ${completed}/${records.length}. Fallos: ${failures.length}.`);
    }
  }));
  if (failures.length) throw new Error(`No se actualizó el catálogo: ${failures.length} fotos no pudieron verificarse. Las copias guardadas se conservan; puedes reintentar --apply.`);
}
export function safeCloudinaryError(status, message = '') {
  const text = String(message).toLowerCase();
  let cause = 'Respuesta no clasificada; revisa el estado de la cuenta y las credenciales.';
  if (/invalid.*api.?key|unknown.*api.?key|api.?key.*not found/.test(text)) cause = 'API Key no reconocida para este Cloud name.';
  else if (/invalid signature|signature.*invalid/.test(text)) cause = 'Firma rechazada: verifica el API Secret de la misma fila que el API Key.';
  else if (/stale|timestamp|expired/.test(text)) cause = 'Fecha de la solicitud rechazada: sincroniza fecha y hora de Windows.';
  else if (/cloud.*(disabled|not found|invalid|unknown)/.test(text)) cause = 'Cloud name no reconocido o cuenta deshabilitada.';
  else if (/fetch|download|remote/.test(text)) cause = 'Cloudinary no pudo descargar la foto del proveedor.';
  return `Cloudinary rechazó la copia (HTTP ${status}). ${cause}`;
}
export async function copyImage(image, config, fetcher = fetch) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params = { overwrite: 'false', public_id: image.publicId, timestamp };
  const form = new FormData();
  form.set('file', image.source);
  for (const [key, value] of Object.entries(params)) form.set(key, value);
  form.set('api_key', config.apiKey);
  form.set('signature', signature(params, config.apiSecret));
  const response = await fetcher(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(120000) });
  if (!response.ok) {
    let message = '';
    try { message = (await response.json()).error?.message || ''; } catch {}
    // Never print the original server message: it may include credentials or signatures.
    throw new Error(safeCloudinaryError(response.status, message));
  }
  const result = await response.json();
  const url = new URL(result.secure_url);
  if (result.public_id !== image.publicId || url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !url.pathname.startsWith(`/${config.cloudName}/image/upload/`)) throw new Error('Respuesta de Cloudinary no válida');
  await verify(url.href, fetcher);
  return { source: image.source, publicId: image.publicId, url: url.href, bytes: result.bytes ?? null, verifiedAt: new Date().toISOString() };
}
export function applyImages(catalog, records, cloudName) {
  const bySource = new Map(Object.values(records).map(r => [r.source, r.url]));
  return { ...catalog, cloudinaryCloudName: cloudName, products: catalog.products.map(p => ({ ...p, sourceImages: p.sourceImages || [...p.images], images: p.images.map(url => bySource.get(url) || url) })) };
}
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run'), apply = args.includes('--apply');
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex < 0 ? Infinity : Number(args[limitIndex + 1]);
  if (!(limit > 0) || (limit !== Infinity && !Number.isInteger(limit))) throw new Error('Usa --limit con un entero positivo');
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) throw new Error('Falta CLOUDINARY_CLOUD_NAME. Configúrala de forma segura.');
  const root = resolve(import.meta.dirname, '..');
  const path = resolve(root, 'data/catalog.json');
  const manifestPath = resolve(root, 'data/cloudinary-manifest.json');
  const catalog = JSON.parse(await readFile(path, 'utf8'));
  const sourceCatalog = { ...catalog, products: catalog.products.map(p => ({...p, images:p.sourceImages || p.images})) };
  const plan = planImages(sourceCatalog, cloudName);
  let manifest = { cloudName, images: {} };
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (manifest.cloudName !== cloudName) throw new Error('El manifiesto pertenece a otra cuenta de Cloudinary');
  const pending = plan.filter(i => !manifest.images[i.key]).slice(0, limit);
  console.log(`Fotos únicas: ${plan.length}. Verificadas previamente: ${Object.keys(manifest.images).length}. Lote: ${pending.length}.`);
  if (dryRun) { console.log('Simulación: no se subieron fotos ni se cambió el catálogo.'); return; }
  const config = { cloudName, apiKey:process.env.CLOUDINARY_API_KEY?.trim(), apiSecret:process.env.CLOUDINARY_API_SECRET?.trim() };
  if (!config.apiKey || !config.apiSecret) throw new Error('Faltan CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET. No las publiques en el chat.');
  if (!/^\d+$/.test(config.apiKey)) throw new Error('API Key no válida: debe ser el número de la columna API Key, sin espacios.');
  if (/^\*+$/.test(config.apiSecret) || config.apiSecret.includes('PEGA_AQUI')) throw new Error('API Secret no válido: copia el valor real, no los asteriscos ni el texto de ejemplo.');
  let failed = 0;
  for (const [index, image] of pending.entries()) {
    try {
      manifest.images[image.key] = await copyImage(image, config);
      await atomicJSON(manifestPath, manifest);
      console.log(`Verificada ${index + 1}/${pending.length}`);
    } catch (error) { failed++; console.error(`Falló foto ${index + 1}/${pending.length}: ${error.message}`); }
  }
  if (apply) {
    // Recheck all saved copies, including those from earlier runs, before switching any URLs.
    await verifySavedImages(Object.values(manifest.images));
    await atomicJSON(path, applyImages(sourceCatalog, manifest.images, cloudName));
    console.log('Catálogo actualizado solo con copias verificadas. Fotos pendientes mantienen su enlace original.');
  }
  console.log(`Copias guardadas: ${Object.keys(manifest.images).length}. Fallos del lote: ${failed}.`);
  if (failed) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
