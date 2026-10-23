import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const BASE='https://violetaangelboutique.ecometri.shop/573215940022';
const API='https://apiv2.ecometri.shop/api/v1/store/violetaangelboutique/products';
const root=resolve(import.meta.dirname,'..');
async function request(url,json=false){
 for(let attempt=0;attempt<3;attempt++){
  try{const r=await fetch(url,{headers:{'User-Agent':'AlmaLatinaCatalogImport/1.0'},signal:AbortSignal.timeout(45000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);return json?await r.json():await r.text();}
  catch(error){if(attempt===2)throw new Error(`No se pudo leer ${new URL(url).hostname}: ${error.message}`);await new Promise(r=>setTimeout(r,1000*(attempt+1)));}
 }
}
export function extractStore(html){
 const parts=[];
 for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){
  const text=match[1];if(!text.startsWith('self.__next_f.push('))continue;
  const row=JSON.parse(text.slice('self.__next_f.push('.length,-1));if(row[0]===1)parts.push(row[1]);
 }
 const text=parts.join('');
 function value(key){const marker=JSON.stringify(key)+':';const start=text.indexOf(marker);if(start<0)throw new Error(`Falta ${key} en la página pública`);
  const tail=text.slice(start+marker.length);let depth=0,quoted=false,escaped=false;
  for(let i=0;i<tail.length;i++){const c=tail[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='{'||c==='[')depth++;else if(c==='}'||c===']'){depth--;if(depth===0)return JSON.parse(tail.slice(0,i+1));}else if(depth===0&&(c===','||c==='\n'))return JSON.parse(tail.slice(0,i));}
  throw new Error(`No se pudo extraer ${key}`);
 }
 return {store:value('initialStoreData'),total:value('initialTotalProducts')};
}
export async function mapLimit(items,fn){
 const result=new Array(items.length);let next=0,failure;
 await Promise.all(Array.from({length:Math.min(4,items.length)},async()=>{
  while(!failure&&next<items.length){const i=next++;try{result[i]=await fn(items[i],i);}catch(error){failure=error;}}
 }));
 if(failure)throw failure;
 return result;
}
export function productImages(product){
 return (product.product_images || []).filter(i=>typeof i.picture_url==='string'&&i.picture_url.trim()).map(i=>'https://d1b50uin55dq3m.cloudfront.net/fit-in/1000x1200/'+i.picture_url);
}
export function compareCatalogs(previous,current){
 const before=new Map(previous.products.map(p=>[p.id,p]));const after=new Map(current.products.map(p=>[p.id,p]));
 const summarize=p=>({id:p.id,sku:p.sku,name:p.name});
 const comparable=p=>JSON.stringify([p.name,p.sku,p.sourcePriceCOP,p.categories,p.sourceImages||p.images,p.sourceDetails?.offers]);
 return {previousTotal:before.size,currentTotal:after.size,added:current.products.filter(p=>!before.has(p.id)).map(summarize),removed:previous.products.filter(p=>!after.has(p.id)).map(summarize),updated:current.products.filter(p=>before.has(p.id)&&comparable(before.get(p.id))!==comparable(p)).map(summarize)};
}
async function main(){
 const path=resolve(root,'data/catalog.json');const previous=JSON.parse(await readFile(path,'utf8'));
 let manifest={images:{}};try{manifest=JSON.parse(await readFile(resolve(root,'data/cloudinary-manifest.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const {store,total}=extractStore(await request(BASE+'/collections/todo/'));
 const categories=store.collections.filter(c=>c.public===1).map(c=>({id:c.id,name:c.name.trim(),slug:c.slug}));
 const counts={};const products=new Map();
 // Sequential categories keep supplier load predictable; details use four connections.
 for(const category of categories){
  const entries=[];const seen=new Set();let expected=null;
  while(expected===null||entries.length<expected){
   const u=new URL(API);u.search=new URLSearchParams({collection:category.slug,limit:'100',offset:String(entries.length)}).toString();
   const page=await request(u,true);expected=Number(page.total_products);
   if(!Number.isInteger(expected)||expected<0||!Array.isArray(page.products))throw new Error('Respuesta de paginación no válida');
   if(!page.products.length&&entries.length<expected)throw new Error('Paginación incompleta');
   for(const p of page.products){if(seen.has(p.id))throw new Error('Paginación duplicada');seen.add(p.id);entries.push(p);}
  }
  if(entries.length!==expected)throw new Error('Conteo de categoría incorrecto');
  counts[category.slug]={total:expected,imported:entries.length};
  for(const p of entries){if(p.active!==1||p.is_hidden_by_limit)continue;if(!products.has(p.id))products.set(p.id,{...p,categories:[]});products.get(p.id).categories.push(category.slug);}
  console.log(`${category.name}: ${entries.length}/${expected}`);
 }
 if(products.size!==total)throw new Error('El total no coincide; el catálogo anterior se conserva');
 const bySource=new Map(Object.values(manifest.images).map(r=>[r.source,r.url]));let completed=0;
 const entries=await mapLimit([...products.values()],async p=>{
  const html=await request(BASE+'/'+encodeURIComponent(p.slug)+'/');let detail;
  for(const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)){
   const data=JSON.parse(m[1]);for(const item of data['@graph']||[data])if(item['@type']==='Product')detail=item;
  }
  if(!detail)throw new Error(`Faltan detalles para ${p.sku}`);
  const sourceImages=productImages(p);
  const {price,quantity_available,...rest}=p;
  if(!Number.isFinite(price)||price<0)throw new Error(`Precio no válido para ${p.sku}; el catálogo anterior se conserva`);
  if(!sourceImages.length)console.log(`Aviso: ${p.sku} no tiene fotos en el catálogo del proveedor.`);
  completed++;if(completed%25===0||completed===products.size)console.log(`Fichas revisadas: ${completed}/${products.size}`);
  return {...rest,description:detail.description||'',sourceDetails:detail,sourceUrl:BASE+'/'+p.slug+'/',sourcePriceCOP:price,sourceImages,images:sourceImages.map(s=>bySource.get(s)||s)};
 });
 const current={importedAt:new Date().toISOString(),sourceTotal:total,complete:true,categories,categoryCounts:counts,products:entries,errors:[],...(manifest.cloudName?{cloudinaryCloudName:manifest.cloudName}:{})};
 const report=compareCatalogs(previous,current);report.importedAt=current.importedAt;
 report.missingImages=entries.filter(p=>!p.images.length).map(p=>({id:p.id,sku:p.sku,name:p.name}));
 current.warnings=report.missingImages.map(p=>({sku:p.sku,message:'El proveedor no publicó fotos de esta prenda'}));
 // Keep a recoverable local snapshot before replacing the catalog. It contains no credentials.
 await writeFile(resolve(root,'data/catalog-before-update.local.json'),JSON.stringify(previous,null,2)+'\n');
 await writeFile(path+'.tmp',JSON.stringify(current,null,2)+'\n');
 await writeFile(resolve(root,'data/catalog-update-report.json'),JSON.stringify(report,null,2)+'\n');
 await rename(path+'.tmp',path);
 console.log(`Catálogo actualizado: ${total} productos. Nuevos: ${report.added.length}. Modificados: ${report.updated.length}. Retirados del proveedor: ${report.removed.length}.`);
 console.log(`Productos sin foto del proveedor: ${report.missingImages.length}. Consulta el informe para ver sus referencias.`);
 console.log('Todavía no se publicó. Revisa data/catalog-update-report.json y copia las fotos nuevas a Cloudinary antes de subir los cambios.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error('No se completó la actualización:',e.message);process.exitCode=1;});
