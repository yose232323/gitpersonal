import test from 'node:test';
import assert from 'node:assert/strict';
import {productImages,mapLimit} from '../scripts/update-catalog.mjs';
test('keeps products without supplier photos without inventing an image',()=>{
 assert.deepEqual(productImages({sku:'Q001',product_images:[]}),[]);
 assert.deepEqual(productImages({sku:'Q001'}),[]);
 assert.deepEqual(productImages({product_images:[{picture_url:''},{picture_url:'valid.jpg'}]}),['https://d1b50uin55dq3m.cloudfront.net/fit-in/1000x1200/valid.jpg']);
});
test('stops starting work after failure and waits for in-flight requests',async()=>{
 let active=0;const started=[];
 await assert.rejects(mapLimit([0,1,2,3,4,5,6,7],async item=>{
  started.push(item);active++;
  try{if(item===0)throw new Error('broken');await new Promise(r=>setTimeout(r,10));return item;}finally{active--;}
 }),/broken/);
 assert.equal(active,0);assert(!started.includes(7));
 assert.deepEqual(await mapLimit([1,2],async n=>n*2),[2,4]);
});
