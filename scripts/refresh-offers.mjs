import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('app/catalog-import.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {normalizeProduct}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const wines=JSON.parse(fs.readFileSync('data/discoveries.json','utf8')),byId=new Map(wines.map(w=>[w.id,w]));
let offers=0;
for(const source of JSON.parse(fs.readFileSync('data/catalog-sources.json','utf8'))){
 for(let page=1;page<=100;page++){
  const response=await fetch(source.origin+'/products.json?limit=250&page='+page,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Source returned '+response.status);
  const {products}=await response.json();
  for(const product of products){const w=normalizeProduct(product,source);if(!w)continue;const previous=byId.get(w.id);if(previous){Object.assign(previous,{price:w.price,currency:w.currency,available:w.available,priceCheckedAt:w.priceCheckedAt});if(w.price)offers++}}
  console.log('Checked merchant page '+page);if(products.length<250)break;
 }
}
fs.writeFileSync('data/discoveries.json',JSON.stringify(wines)+'\n');console.log(JSON.stringify({offers,total:wines.length}));
