"""Import public catalog pages. Does not invent supplier availability or stock."""
import json,re,concurrent.futures,datetime
from pathlib import Path
from urllib.request import urlopen,Request
BASE='https://violetaangelboutique.ecometri.shop/573215940022'
def read(url):
 with urlopen(Request(url,headers={'User-Agent':'AlmaLatinaCatalogImport/1.0'}),timeout=30) as r: return r.read().decode()
def props(html):
 chunks=[]
 for script in re.findall(r'<script[^>]*>(.*?)</script>',html,re.S):
  if script.startswith('self.__next_f.push('):
   try:
    row=json.loads(script[len('self.__next_f.push('):-1])
    if row[0]==1:chunks.append(row[1])
   except (ValueError,IndexError):pass
 text=''.join(chunks)
 marker='"initialStoreData":'; start=text.index(marker)+len(marker)
 store=json.JSONDecoder().raw_decode(text[start:])[0]
 marker='"initialProducts":';start=text.index(marker)+len(marker)
 products=json.JSONDecoder().raw_decode(text[start:])[0]
 marker='"initialTotalProducts":';start=text.index(marker)+len(marker)
 total=json.JSONDecoder().raw_decode(text[start:])[0]
 return store,products,total
store,first,total=props(read(BASE+'/collections/todo/'))
categories=[{'id':c['id'],'name':c['name'].strip(),'slug':c['slug']} for c in store['collections'] if c['public']==1]
products={};counts={};errors=[]
def get_category(c):
 try:return c,props(read(BASE+'/collections/'+c['slug']+'/'))[1:]
 except Exception as e:return c,e
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for c,result in pool.map(get_category,categories):
  if isinstance(result,Exception):errors.append(c['slug']+': '+str(result));continue
  entries,count=result;counts[c['slug']]={'total':count,'imported':len(entries)}
  for p in entries:
   if p.get('active')!=1 or p.get('is_hidden_by_limit'):continue
   if p['id'] not in products:products[p['id']]={**p,'categories':[]}
   products[p['id']]['categories'].append(c['slug'])
# Product pages expose public descriptions and options in JSON-LD / rendered data.
def detail(p):
 try:
  html=read(BASE+'/'+p['slug']+'/')
  for raw in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',html,re.S):
   ld=json.loads(raw)
   graph=ld.get('@graph',[ld])
   for item in graph:
    if item.get('@type')=='Product':
     p['description']=item.get('description','');p['sourceDetails']=item
  return p,None
 except Exception as e:return p,p['slug']+': '+str(e)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for p,error in pool.map(detail,list(products.values())):
  if error:errors.append(error)
for p in products.values():
 p['sourceUrl']=BASE+'/'+p['slug']+'/'
 p['images']=['https://d1b50uin55dq3m.cloudfront.net/fit-in/1000x1200/'+i['picture_url'] for i in p.get('product_images',[])]
 p['sourcePriceCOP']=p['price'];del p['price']
 # No local stock inferred from source.
 p.pop('quantity_available',None)
result={'importedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceTotal':total,'complete':False,'categories':categories,'categoryCounts':counts,'products':list(products.values()),'errors':errors}
# Keep verified Cloudinary copies across supplier refreshes.
manifest_path=Path('data/cloudinary-manifest.json')
if manifest_path.exists():
 manifest=json.loads(manifest_path.read_text())
 records={r['source']:r['url'] for r in manifest['images'].values()}
 result['cloudinaryCloudName']=manifest['cloudName']
 for product in result['products']:
  product['sourceImages']=list(product['images'])
  product['images']=[records.get(url,url) for url in product['images']]
Path('data/catalog.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('Imported',len(products),'of',total,'products. Categories:',len(categories),'Errors:',len(errors))
print(json.dumps(counts,ensure_ascii=False))
