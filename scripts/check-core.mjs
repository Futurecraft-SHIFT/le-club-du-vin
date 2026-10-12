import fs from 'node:fs';import ts from 'typescript';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const dir='.sites-runtime/route-tests';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(dir+'/context.mjs',`import {DatabaseSync} from 'node:sqlite';export const db=new DatabaseSync(':memory:');export let user=null;export function setUser(u){user=u}export async function getChatGPTUser(){return user}const objects=new Map();export const env={BUCKET:{async list({prefix}){return {objects:[...objects.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key})),truncated:false}},async get(k){const v=objects.get(k);return v?{async json(){return JSON.parse(v)}}:null},async put(k,v){objects.set(k,v)}},ADMIN_BOOTSTRAP_EMAIL:'owner@test.invalid',PRIVATE_CATALOG_UPDATER:'enabled',DB:{prepare(sql){let args=[];return {bind(...a){args=a;return this},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}}}}},async batch(list){return Promise.all(list.map(s=>s.run()))}}};`);
function compile(file,name,replacements={}){let code=fs.readFileSync(file,'utf8');for(const [from,to] of Object.entries(replacements))code=code.replaceAll(from,to);fs.writeFileSync(dir+'/'+name+'.mjs',ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText)}
compile('app/account-settings.ts','account-settings',{"'cloudflare:workers'":"'./context.mjs'"});compile('app/friendships.ts','friendships',{"'cloudflare:workers'":"'./context.mjs'"});compile('app/api/friends/route.ts','friends',{"'cloudflare:workers'":"'./context.mjs'","'../../chatgpt-auth'":"'./context.mjs'","'../../friendships'":"'./friendships.mjs'","'../../flavor'":"'./flavor.mjs'","'../../personal-ranking'":"'./personal-ranking.mjs'","'../../wine-styles'":"'./wine-styles.mjs'","import seed from '../../../data/discoveries.json';":'const seed='+fs.readFileSync('data/discoveries.json','utf8')+';'});compile('app/price-types.ts','price-types');compile('app/bottle-price.ts','bottle-price',{"'cloudflare:workers'":"'./context.mjs'"});compile('app/price-recommendations.ts','price-recommendations',{"'./personal-ranking'":"'./personal-ranking.mjs'"});compile('app/tasting-scale.ts','tasting-scale');compile('app/wine-styles.ts','wine-styles');compile('app/personal-taste.ts','personal', {"'./tasting-scale'":"'./tasting-scale.mjs'"});compile('app/personal-ranking.ts','personal-ranking', {"'./personal-taste'":"'./personal.mjs'","'./wine-styles'":"'./wine-styles.mjs'"});compile('app/flavor.ts','flavor',{"'./personal-taste'":"'./personal.mjs'","'./wine-styles'":"'./wine-styles.mjs'"});compile('app/admin-auth.ts','admin-auth',{"'cloudflare:workers'":"'./context.mjs'"});compile('app/api/club/route.ts','club',{"'cloudflare:workers'":"'./context.mjs'","'../../chatgpt-auth'":"'./context.mjs'","'../../admin-auth'":"'./admin-auth.mjs'","'../../account-settings'":"'./account-settings.mjs'","'../../bottle-price'":"'./bottle-price.mjs'","'../../price-types'":"'./price-types.mjs'","'../../wine-styles'":"'./wine-styles.mjs'","'../../flavor'":"'./flavor.mjs'","'../../personal-ranking'":"'./personal-ranking.mjs'","import seedCatalog from '../../../data/discoveries.json';":'const seedCatalog='+fs.readFileSync('data/discoveries.json','utf8')+';'});compile('app/api/admin/route.ts','admin',{"'cloudflare:workers'":"'./context.mjs'","'../../chatgpt-auth'":"'./context.mjs'","'../../admin-auth'":"'./admin-auth.mjs'"});
const base=pathToFileURL(process.cwd()+'/'+dir+'/');const ctx=await import(new URL('context.mjs',base));for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())ctx.db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const club=await import(new URL('club.mjs',base)),admin=await import(new URL('admin.mjs',base)),taste=await import(new URL('personal.mjs',base));
const identity=(id,email=id+'@test.invalid')=>({userId:id,email,displayName:id,fullName:null});const req=(body)=>new Request('https://test.invalid/api/club',{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
async function get(){return (await club.GET(req())).json()}async function post(body){return club.POST(req(body))}
ctx.setUser(null);assert.equal((await admin.GET(req())).status,401);assert.equal((await post({action:'bottle'})).status,401);
ctx.setUser(identity('new'));let first=await get();assert.deepEqual(first.bottles,[]);assert.deepEqual(first.tastings,[]);assert.deepEqual(first.sessions,[]);assert.equal((await admin.GET(req())).status,403);assert.deepEqual((await get()).bottles,[]);
await post({action:'profile',name:'ALEX B',is_public:false});assert.equal((await admin.GET(req())).status,403);
ctx.setUser(identity('owner'));let owner=await get();assert.equal(owner.user.is_admin,true);assert.equal(owner.profile.name,'ALEX B');assert.equal((await admin.GET(req())).status,200);
let session=await (await post({action:'session',name:'Test',date:'2026-10-12'})).json();let data=await get();let code=data.sessions[0].code;
let result=await post({action:'bottle',name:'Custom unindexed wine',producer:'My local maker',vintage:'2023',style:'Orange',region:'Unknown',grapes:'Pinot Gris',comments:'Private comment',count:1,session_id:session.id});assert.equal(result.status,200);const bottle=(await result.json()).id;
assert.equal((await get()).bottles[0].comments,'Private comment');assert.equal((await get()).bottles[0].drink_from,'');assert.equal((await get()).bottles[0].drink_to,'');
ctx.setUser(identity('new'));await post({action:'join',code});data=await get();assert.equal(data.bottles[0].comments,null);assert.equal(data.bottles[0].grapes,'Pinot Gris');assert.equal((await post({action:'count',id:bottle,count:4})).status,403);
await post({action:'taste',bottle_id:bottle,date:'2026-10-12',score:100,notes:'Too sour. Not for me.',axes:[15,15,25,15,15,15]});data=await get();assert.equal(data.tastings.length,1);assert.equal(data.tastings[0].grapes,'Pinot Gris');assert.equal(taste.enjoyment(data.tastings[0]),1);assert.equal(taste.perceivedAxes(data.tastings[0])[2],2.5);assert.equal(data.tastings[0].score*20,100);
ctx.setUser(identity('owner'));assert.equal((await get()).tastings.length,0);let metrics=await (await admin.GET(req())).json();assert.equal(metrics.totals.bottles,1);assert.equal(JSON.stringify(metrics).includes('Private comment'),false);
ctx.setUser(identity('new'));await post({action:'profile',name:'Public taste',is_public:true});const p=(await get()).profile;ctx.setUser(null);const pub=await (await club.GET(new Request('https://test.invalid/api/club?profile='+p.share_id))).json();assert.ok(Array.isArray(pub.recommendations));assert.equal(JSON.stringify(pub).includes('Too sour'),false);
console.log('PASS: empty first login and reload; admin bootstrap and spoof rejection; persisted custom wine/grapes/comments; private comments hidden from table members; stock ownership; personal notes override ratings/axes; separate tasting history; aggregate admin metrics. Actual route code + SQLite; platform auth boundary tested separately by local UI.');

const scale=await import(new URL('tasting-scale.mjs',base));
for(const values of [[5,5,5,5,5,5],[0,0,0,0,0,0],[1,9,3,0,4,2]]){assert.equal(scale.percentages(values).reduce((a,b)=>a+b,0),100);for(let axis=0;axis<6;axis++)for(let target=0;target<=100;target++){const v=scale.redistribute(scale.percentages(values),axis,target);assert.equal(v[axis],target);assert.equal(v.reduce((a,b)=>a+b,0),100);}}
ctx.setUser(identity('owner'));
assert.equal((await post({action:'taste',bottle_id:bottle,date:'2026-10-12',score:101,notes:'',axes:[15,15,25,15,15,15]})).status,400);
assert.equal((await post({action:'taste',bottle_id:bottle,date:'2026-10-12',score:80,notes:'',axes:[1,2,3,4,5,6]})).status,400);
console.log('PASS: 100-point scales, exact totals, redistribution boundaries, invalid scores rejected.');

const edit={action:'edit_bottle',id:bottle,name:'Corrected wine',producer:'My local maker',vintage:'2022',style:'Natural Red',region:'Austria',count:2,grapes:'Zweigelt',comments:'Updated notes',session_id:session.id};
assert.equal((await post(edit)).status,200);assert.equal((await get()).bottles.find(b=>b.id===bottle).style,'Natural Red');assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM bottles').get().n,1);
ctx.setUser(identity('new'));assert.equal((await post({...edit,name:'Not mine'})).status,403);
console.log('PASS: owner editing preserves bottle ID and history; table members cannot edit another owner’s bottle.');

assert.equal((await get()).tastings[0].name,'Corrected wine');
assert.equal((await get()).tastings.length,1);
const styles=await import(new URL('wine-styles.mjs',base));ctx.setUser(identity('owner'));
for(const style of styles.WINE_STYLES)assert.equal((await post({...edit,style})).status,200);
assert.equal((await post({action:'taste',bottle_id:bottle,date:'2026-10-12',score:0,notes:'',axes:[100,0,0,0,0,0]})).status,200);
const flavor=await import(new URL('flavor.mjs',base));assert.ok(flavor.flavor((await get()).tastings).every(Number.isFinite));
console.log('PASS: all wine styles save, editing retains tasting associations, zero enjoyment remains valid.');

ctx.setUser(identity('owner'));assert.equal((await post({...edit,price:24.5,currency:'EUR',purchase_context:'Shop'})).status,200);
assert.equal((await get()).bottles[0].price,24.5);assert.equal((await get()).bottles[0].purchase_context,'Shop');
ctx.setUser(identity('new'));assert.equal((await get()).bottles[0].price,undefined);assert.equal((await post({...edit,price:1,currency:'EUR',purchase_context:'Shop'})).status,403);
ctx.setUser(identity('owner'));assert.equal((await get()).bottles[0].price,24.5);assert.equal((await post({...edit,price:-1})).status,400);
const pricing=await import(new URL('price-recommendations.mjs',base));const review={name:'Past',producer:'Maker',style:'White',score:4,notes:'I loved it',axes:'[2,1,2,1,2,2]',grapes:'Chardonnay'};
const offers=[10,20,30].map((price,i)=>({id:String(i),name:'Wine '+i,producer:'New',style:'White',grapes:'Chardonnay',price,currency:'EUR',available:true,priceCheckedAt:new Date().toISOString()}));
const tiers=pricing.priceDiscoveries([review],offers,{price:20,currency:'EUR'},{USD:1});assert.deepEqual(tiers.map(t=>t.wine.price),[10,20,30]);
assert.ok(pricing.priceDiscoveries([review],offers.map(w=>({...w,currency:'USD'})),{price:20,currency:'EUR'},{USD:1}).every(t=>!t.wine));
assert.ok(pricing.priceDiscoveries([review],offers.map(w=>({...w,priceCheckedAt:'2000-01-01'})),{price:20,currency:'EUR'},{USD:1}).every(t=>!t.wine));
console.log('PASS: persistent private prices, currency validation, price tiers, missing exchange rates and stale offers.');

const friends=await import(new URL('friends.mjs',base));const friendsPost=body=>friends.POST(req(body));
ctx.setUser(identity('owner'));assert.equal((await friendsPost({action:'request',code:p.share_id})).status,200);
assert.equal((await friends.GET(new Request('https://test.invalid/api/friends?profile=new'))).status,403);
assert.equal((await friendsPost({action:'accept',id:'new'})).status,403);
ctx.setUser(identity('stranger'));assert.equal((await friendsPost({action:'accept',id:'owner'})).status,404);
ctx.setUser(identity('new'));assert.equal((await friendsPost({action:'accept',id:'owner'})).status,200);
let friendResponse=await friends.GET(new Request('https://test.invalid/api/friends?profile=owner'));assert.equal(friendResponse.status,200);let friendData=await friendResponse.json();assert.equal(friendData.bottles.length,1);assert.equal(friendData.bottles[0].comments,undefined);assert.equal(friendData.bottles[0].price,undefined);assert.equal(friendData.profile.email,undefined);
assert.equal((await friendsPost({action:'remove',id:'owner'})).status,200);assert.equal((await friends.GET(new Request('https://test.invalid/api/friends?profile=owner'))).status,403);
ctx.setUser(identity('owner'));assert.equal((await friends.GET(new Request('https://test.invalid/api/friends?profile=new'))).status,403);
console.log('PASS: reciprocal friend acceptance, pending/stranger access denied, private data excluded, removal revokes both directions.');

ctx.setUser(identity('owner'));await post({action:'profile',name:'ALEX B',is_public:false,weekly:true});assert.equal((await get()).account.weekly,true);await post({action:'profile',name:'ALEX B',is_public:false,weekly:false});assert.equal((await get()).account.weekly,false);console.log('PASS: newsletter preference persists with opt-in and opt-out.');

ctx.setUser(identity('owner'));
const beforeEdit=(await get()).tastings, targetTaste=beforeEdit[0];
const editTaste={action:'edit_taste',id:targetTaste.id,date:targetTaste.date,score:93,notes:'Bright and delicious',axes:[40,10,20,5,10,15]};
assert.equal((await post(editTaste)).status,200);
const updatedTaste=(await get()).tastings.find(t=>t.id===targetTaste.id);
assert.equal(updatedTaste.score*20,93);assert.deepEqual(JSON.parse(updatedTaste.axes),[4,1,2,.5,1,1.5]);
assert.equal(updatedTaste.bottle_id,targetTaste.bottle_id);assert.equal((await get()).tastings.length,beforeEdit.length);
assert.equal((await post({...editTaste,score:101})).status,400);
assert.equal((await post({...editTaste,axes:[40,10,20,5,10,14]})).status,400);
ctx.setUser(identity('new'));assert.equal((await post(editTaste)).status,403);
ctx.setUser(identity('owner'));assert.equal((await get()).tastings.find(t=>t.id===targetTaste.id).score*20,93);
console.log('PASS: tasting edits retain identity and bottle, update score and axes without duplicates, validate totals and reject other members.');

compile('app/nearby-wine.ts','nearby-wine');
const nearby=await import(new URL('nearby-wine.mjs',base));
assert.equal(nearby.publicWebsite('https://127.0.0.1/test'),null);
assert.equal(nearby.publicWebsite('http://shop.example.com'),null);
assert.equal(nearby.pageEvidence('<p>Meinklang Burgenlandrot 2023</p>','Meinklang Burgenlandrot 2023','https://shop.example.com').status,'listed');
const stock=(name,availability)=>'<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name,offers:{availability}})+'</script>';
assert.equal(nearby.pageEvidence(stock('Meinklang Burgenlandrot 2023','https://schema.org/InStock'),'Meinklang Burgenlandrot 2023','https://shop.example.com').status,'online-stock');
assert.equal(nearby.pageEvidence(stock('Different bottle','https://schema.org/InStock'),'Meinklang Burgenlandrot 2023','https://shop.example.com'),null);
assert.equal(nearby.pageEvidence(stock('Meinklang Burgenlandrot 2023','https://schema.org/OutOfStock'),'Meinklang Burgenlandrot 2023','https://shop.example.com'),null);
assert.equal(nearby.bottleMention('Meinklang '+('unrelated '.repeat(100))+'Burgenlandrot','Meinklang Burgenlandrot'),false);
assert.equal(nearby.nearbyPlaces([{type:'node',id:1,lat:0,lon:0,tags:{name:'Near',shop:'wine'}},{type:'node',id:2,lat:1,lon:1,tags:{name:'Far',shop:'wine'}}],0,0).length,1);
const venues=[1,2,3,4].map(n=>({id:String(n),kind:'shop',distance:n/10,status:n===4?'online-stock':'unconfirmed'}));
assert.equal(nearby.chooseVenues(venues,'shop')[0].id,'4');assert.equal(nearby.chooseVenues(venues,'shop').length,3);
console.log('PASS: strict radius, product-specific stock, out-of-stock rejection, local evidence matching and verified-first venue selection.');

ctx.setUser(identity('owner'));await post({action:'profile',name:'ALEX B',is_public:false,weekly:true,contact_email:'new-contact@test.invalid'});assert.equal((await get()).account.contactEmail,'new-contact@test.invalid');await post({action:'profile',name:'ALEX B',is_public:false,weekly:false});assert.equal((await get()).account.contactEmail,'new-contact@test.invalid');assert.equal((await get()).user.email,'owner@test.invalid');assert.equal((await post({action:'profile',name:'ALEX B',is_public:false,contact_email:'invalid'})).status,400);ctx.setUser(identity('new'));assert.equal((await get()).account.contactEmail,undefined);
console.log('PASS: contact email persists privately across settings changes, validates input and cannot change sign-in identity.');
