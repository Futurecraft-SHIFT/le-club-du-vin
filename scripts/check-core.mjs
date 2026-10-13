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

fs.writeFileSync(dir+'/auth-context.mjs',`export let providerUser=null;export let updated=null;export let signupSession=null;export let signupInput=null;export function setSignupSession(s){signupSession=s}export function setProviderUser(u){providerUser=u}export function createServerClient(){return {auth:{async signUp(input){signupInput=input;return {data:{session:signupSession},error:null}},async getUser(){return {data:{user:providerUser},error:null}},async updateUser(value){updated=value;return {error:null}}}}}export async function cookies(){return {getAll:()=>[],set:()=>{}}}`);
compile('app/auth-server.ts','auth-server',{"'cloudflare:workers'":"'./context.mjs'","'@supabase/ssr'":"'./auth-context.mjs'","'next/headers'":"'./auth-context.mjs'"});
compile('app/api/auth/route.ts','auth-route',{"'../../auth-server'":"'./auth-server.mjs'"});
const authTest=await import(new URL('auth-context.mjs',base)),authServer=await import(new URL('auth-server.mjs',base)),authRoute=await import(new URL('auth-route.mjs',base));ctx.env.SUPABASE_URL='https://auth.test.invalid';ctx.env.SUPABASE_PUBLISHABLE_KEY='test-public-key';ctx.env.ADMIN_SUPABASE_USER_ID='verified-owner';
authTest.setProviderUser({id:'verified-owner',email:'owner@test.invalid'});assert.equal(await authServer.memberIdentity(),null);
delete ctx.env.ADMIN_SUPABASE_USER_ID;authTest.setProviderUser({id:'unverified-email-claimant',email:'owner@test.invalid',email_confirmed_at:'2026-10-13',user_metadata:{}});assert.equal((await authServer.memberIdentity()).userId,'member:unverified-email-claimant');ctx.env.ADMIN_SUPABASE_USER_ID='verified-owner';
authTest.setProviderUser({id:'verified-owner',email:'owner@test.invalid',email_confirmed_at:'2026-10-12',user_metadata:{}});assert.equal((await authServer.memberIdentity()).userId,'owner');
authTest.setProviderUser({id:'verified-owner',email:'changed@test.invalid',email_confirmed_at:'2026-10-12',user_metadata:{}});assert.equal((await authServer.memberIdentity()).userId,'owner');
authTest.setProviderUser({id:'other-account',email:'owner@test.invalid',email_confirmed_at:'2026-10-12',user_metadata:{}});assert.equal((await authServer.memberIdentity()).userId,'member:other-account');
const emailRequest=(email,origin='https://test.invalid')=>new Request('https://test.invalid/api/auth',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'change_email',email})});
assert.equal((await authRoute.POST(emailRequest('new@test.invalid','https://evil.invalid'))).status,403);assert.equal((await authRoute.POST(emailRequest('bad'))).status,400);authTest.setProviderUser(null);assert.equal((await authRoute.POST(emailRequest('new@test.invalid'))).status,401);authTest.setProviderUser({id:'verified-owner'});assert.equal((await authRoute.POST(emailRequest('new@test.invalid'))).status,200);assert.deepEqual(authTest.updated,{email:'new@test.invalid'});
console.log('PASS: unverified owner denied, stable admin identity after email change, different auth account cannot reclaim owner, authenticated same-origin email-change request.');

ctx.env.EMAIL_VERIFICATION_REQUIRED='false';assert.equal((await authRoute.GET()).status,200);assert.equal((await (await authRoute.GET()).json()).emailVerificationRequired,false);assert.equal((await authRoute.POST(emailRequest('other@test.invalid'))).status,503);
console.log('PASS: deferred verification configuration and blocked email-dependent actions.');

const signupRequest=()=>new Request('https://test.invalid/api/auth',{method:'POST',headers:{Origin:'https://test.invalid','Content-Type':'application/json'},body:JSON.stringify({action:'signup',email:'new@test.invalid',password:'test-password-only-123',username:'NewMember',weekly:true})});authTest.setSignupSession({access_token:'test-session'});assert.equal((await (await authRoute.POST(signupRequest())).json()).signedIn,true);assert.equal(authTest.signupInput.options.data.email_verification_deferred,true);assert.equal(authTest.signupInput.options.data.weekly_recommendations,undefined);authTest.setSignupSession(null);assert.equal((await (await authRoute.POST(signupRequest())).json()).signedIn,undefined);console.log('PASS: immediate signup session, no false sign-in without session, deferred-email marker, newsletter opt-in removed.');

// Linked-owner aliases must be archived before removal, and populated aliases must survive.
authTest.setProviderUser({id:'verified-owner',email:'owner@test.invalid',email_confirmed_at:'2026-10-13',user_metadata:{}});
ctx.setUser(identity('member:verified-owner'));await get();
await authServer.memberIdentity();
assert.equal(ctx.db.prepare('SELECT id FROM profiles WHERE id=?').get('member:verified-owner'),undefined);
assert.ok(await ctx.env.BUCKET.get('private-auth/archived-profiles/member%3Averified-owner.json'));
await get();const retainedBottle=await (await post({action:'bottle',name:'Do not remove',producer:'Maker',vintage:'2023',style:'Orange',region:'Test',count:1,session_id:null})).json();
await authServer.memberIdentity();
assert.ok(ctx.db.prepare('SELECT id FROM profiles WHERE id=?').get('member:verified-owner'));
assert.ok(ctx.db.prepare('SELECT id FROM bottles WHERE id=?').get(retainedBottle.id));
console.log('PASS: empty linked-owner duplicate archived and removed; populated alias and its bottle preserved.');

compile('app/audience-types.ts','audience-types');
compile('app/audience-store.ts','audience-store',{"'cloudflare:workers'":"'./context.mjs'","'./audience-types'":"'./audience-types.mjs'"});
compile('app/audience-report.ts','audience-report',{"'./audience-types'":"'./audience-types.mjs'"});
compile('app/api/audience/route.ts','audience-route',{"'cloudflare:workers'":"'./context.mjs'","'../../chatgpt-auth'":"'./context.mjs'","'../../audience-store'":"'./audience-store.mjs'","'../../audience-types'":"'./audience-types.mjs'"});
compile('app/api/admin/audience/route.ts','audience-admin',{"'cloudflare:workers'":"'./context.mjs'","'../../../chatgpt-auth'":"'./context.mjs'","'../../../admin-auth'":"'./admin-auth.mjs'","'../../../audience-store'":"'./audience-store.mjs'","'../../../audience-types'":"'./audience-types.mjs'","'../../../bottle-price'":"'./bottle-price.mjs'","'../../../audience-report'":"'./audience-report.mjs'","'../../../price-types'":"'./price-types.mjs'"});
const audience=await import(new URL('audience-route.mjs',base)),reports=await import(new URL('audience-report.mjs',base)),audienceAdmin=await import(new URL('audience-admin.mjs',base));
const audReq=(body,origin='https://test.invalid')=>new Request('https://test.invalid/api/audience',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const details={allowed:true,country:'Germany',city:'Berlin',age_band:'25'+String.fromCharCode(8211)+'34',gender:'Man'};
ctx.setUser(null);assert.equal((await audience.GET()).status,401);assert.equal((await audience.POST(audReq(details))).status,401);
ctx.setUser(identity('owner'));assert.equal((await audience.POST(audReq(details,'https://evil.invalid'))).status,403);assert.equal((await audience.POST(audReq({...details,age_band:'13'}))).status,400);
assert.equal((await audience.POST(audReq(details))).status,200);let aud=await (await audience.GET()).json();assert.equal(aud.allowed,true);assert.equal(aud.city,'Berlin');assert.ok(aud.consentAt);
ctx.setUser(identity('new'));assert.equal((await (await audience.GET()).json()).allowed,false);assert.equal((await audienceAdmin.GET(new Request('https://test.invalid/api/admin/audience'))).status,403);
ctx.setUser(identity('owner'));await audience.POST(audReq({...details,allowed:false}));aud=await (await audience.GET()).json();assert.equal(aud.country,'');assert.equal(aud.city,'');assert.equal(aud.age_band,'');assert.equal(aud.gender,'');assert.equal(aud.consentAt,null);
const testMembers=Array.from({length:6},(_,i)=>({id:'p'+i,profile:{...details,version:'audience-research-v1',allowed:i<5}}));
const testRows=testMembers.map((m,i)=>({owner:m.id,style:'Natural White',date:'2026-10-11',price:10+i*5,currency:'EUR',context:'Shop',purchase_country:'France',purchase_city:'Paris',country:'Germany',city:'Berlin',age_band:details.age_band,gender:'Man'}));
let report=reports.makeAudienceReport(testMembers,testRows,{currency:'EUR'});assert.equal(report.suppressed,false);assert.equal(report.summary.members,5);assert.equal(report.summary.bottles,5);assert.equal(report.summary.medianPrice,20);assert.equal(JSON.stringify(report).includes('p0'),false);
assert.equal(reports.makeAudienceReport(testMembers,testRows,{currency:'USD'}).suppressed,true);assert.equal(reports.makeAudienceReport(testMembers,testRows,{min:'20'}).suppressed,true);assert.equal(reports.makeAudienceReport(testMembers,testRows,{from:'2026-10-12'}).suppressed,true);assert.equal(reports.makeAudienceReport(testMembers,testRows,{country:'FRANCE'}).suppressed,true);assert.equal(reports.makeAudienceReport(testMembers,testRows,{purchase_country:'france'}).suppressed,false);
testMembers[0].profile.allowed=false;assert.equal(reports.makeAudienceReport(testMembers,testRows,{}).suppressed,true);
const purchase=await (await post({action:'bottle',name:'Purchase test',producer:'Maker',vintage:'2026',style:'Natural White',region:'Test',count:1,session_id:null,price:25,currency:'EUR',purchase_context:'Restaurant',purchase_country:'France',purchase_city:'Paris',purchase_date:'2026-10-11'})).json();
const bought=(await get()).bottles.find(b=>b.id===purchase.id);assert.equal(bought.purchase_country,'France');assert.equal(bought.purchase_date,'2026-10-11');assert.equal((await post({action:'edit_bottle',...bought,purchase_date:'2026-02-30'})).status,400);
console.log('PASS: separate audience opt-in, same-origin writes, private fields, withdrawal clears demographics, admin-only aggregates, minimum group size, consent exclusion, currency/date/location/price filters, original purchase data persists.');

compile('app/api/admin/members/route.ts','admin-members',{"'cloudflare:workers'":"'./context.mjs'","'../../../chatgpt-auth'":"'./context.mjs'","'../../../admin-auth'":"'./admin-auth.mjs'","'../../../flavor'":"'./flavor.mjs'"});
const directory=await import(new URL('admin-members.mjs',base));
const membersRequest=(query='')=>directory.GET(new Request('https://test.invalid/api/admin/members?'+query));
ctx.setUser(null);assert.equal((await membersRequest()).status,401);
ctx.setUser(identity('new'));assert.equal((await membersRequest()).status,403);assert.equal((await membersRequest('member=owner')).status,403);
ctx.setUser(identity('owner'));let directoryResponse=await membersRequest();assert.equal(directoryResponse.headers.get('Cache-Control'),'private, no-store');let directoryData=await directoryResponse.json();assert.ok(directoryData.members.some(m=>m.id==='owner'));assert.ok(directoryData.members.every(m=>!('email' in m)&&!('notes' in m)));
let mine=await (await membersRequest('member=owner')).json();assert.ok(mine.total>0);assert.ok(mine.portrait);assert.ok(mine.bottles.every(b=>!('notes' in b)&&!('comments' in b)&&!('price' in b)));
ctx.db.prepare('UPDATE profiles SET is_public=0 WHERE id=?').run('new');assert.equal((await (await membersRequest('member=new')).json()).portrait,null);
ctx.db.prepare('UPDATE profiles SET is_public=1 WHERE id=?').run('new');assert.ok((await (await membersRequest('member=new')).json()).portrait);
assert.equal((await membersRequest('member=missing')).status,404);assert.equal((await (await membersRequest('q=%25')).json()).total,0);
assert.equal((await (await membersRequest('page=1')).json()).members.length,0);assert.equal((await (await membersRequest('q=ALEX')).json()).members[0].id,'owner');
console.log('PASS: admin member directory requires admin, paginates and searches, lists registered bottles without private notes/prices, respects flavor sharing and self-access, disables caching.');

compile('app/locator-provider.ts','locator-provider');
const locatorProvider=await import(new URL('locator-provider.mjs',base));
let providerCalls=0;
const recovered=await locatorProvider.discoverVenues('test',undefined,async()=>{providerCalls++;return providerCalls===1?new Response('busy',{status:504}):Response.json({elements:[{id:123}]})});
assert.equal(providerCalls,2);assert.equal(recovered[0].id,123);
providerCalls=0;await locatorProvider.discoverVenues('test',undefined,async()=>{providerCalls++;return providerCalls===1?Response.json({elements:[],remark:'runtime error: timed out'}):Response.json({elements:[]})});assert.equal(providerCalls,2);
providerCalls=0;await locatorProvider.discoverVenues('test',undefined,async()=>{providerCalls++;if(providerCalls===1)throw new DOMException('Timed out','TimeoutError');return Response.json({elements:[]})});assert.equal(providerCalls,2);
providerCalls=0;assert.deepEqual(await locatorProvider.discoverVenues('test',undefined,async()=>{providerCalls++;return Response.json({elements:[]})}),[]);assert.equal(providerCalls,1);
await assert.rejects(()=>locatorProvider.discoverVenues('test',undefined,async()=>new Response('busy',{status:429})),/MAP_PROVIDERS_UNAVAILABLE/);
await assert.rejects(()=>locatorProvider.limitedText(new Response('12345'),4),/too large/);
console.log('PASS: nearby map fallback on timeout/HTTP failure/incomplete responses, valid empty results preserved, exhausted providers distinguished, response size bounded.');
