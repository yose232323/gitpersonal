import test from 'node:test';
import assert from 'node:assert/strict';
import { planImages, copyImage, applyImages } from '../scripts/cloudinary-import.mjs';
const source = 'https://d1b50uin55dq3m.cloudfront.net/fit-in/1000x1200/photo.jpg';
const catalog = { products: [{ id: 'one', images: [source] }, { id: 'two', images: [source] }] };
const image = planImages(catalog, 'testcloud')[0];
const config = {cloudName:'testcloud',apiKey:'test-key',apiSecret:'test-secret'};
test('deduplicates identical source assets and rejects unexpected origins',()=>{
 assert.equal(planImages(catalog,'testcloud').length,1);
 assert.equal(planImages({products:[{images:[source.replace('1000x1200','800x800')]}]},'testcloud')[0].publicId,image.publicId);
 assert.throws(()=>planImages({products:[{images:['https://example.com/image.jpg']}]},'testcloud'));
});
test('only accepts a matching Cloudinary response and nonempty verified image',async()=>{
 let calls=0;
 const record=await copyImage(image,config,async(url,options)=>{
  calls++;
  if(options.method==='POST'){
   assert.equal(options.body.get('overwrite'),'false');
   assert.equal(options.body.get('public_id'),image.publicId);
   assert(options.body.get('signature'));
   return Response.json({public_id:image.publicId,secure_url:'https://res.cloudinary.com/testcloud/image/upload/photo.jpg',bytes:3});
  }
  return new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'image/jpeg'}});
 });
 assert.equal(calls,2);assert.equal(record.source,source);
 await assert.rejects(copyImage(image,config,async()=>Response.json({public_id:'wrong',secure_url:'https://example.com/photo.jpg'})));
 await assert.rejects(copyImage(image,config,async(url,options)=>options.method==='POST'?Response.json({public_id:image.publicId,secure_url:'https://res.cloudinary.com/testcloud/image/upload/photo.jpg'}):new Response('',{status:404})));
});
test('leaves unverified sources intact and retains originals for future refresh',()=>{
 const extra='https://d1b50uin55dq3m.cloudfront.net/fit-in/1000x1200/other.jpg';
 const result=applyImages({products:[{id:'one',images:[source,extra]}]},{key:{source,url:'https://res.cloudinary.com/testcloud/image/upload/photo.jpg'}},'testcloud');
 assert.deepEqual(result.products[0].sourceImages,[source,extra]);
 assert.equal(result.products[0].images[1],extra);
 assert(result.products[0].images[0].includes('res.cloudinary.com'));
});
