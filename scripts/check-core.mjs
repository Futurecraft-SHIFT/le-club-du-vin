import fs from 'node:fs';import ts from 'typescript';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const dir='.sites-runtime/route-tests';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(dir+'/context.mjs',`import {DatabaseSync} from 'node:sqlite';export const db=new DatabaseSync(':memory:');export let user=null;export function setUser(u){user=u}export async function getChatGPTUser(){return user}export const env={ADMIN_BOOTSTRAP_EMAIL:'owner@test.invalid',PRIVATE_CATALOG_UPDATER:'enabled',DB:{prepare(sql){let args=[];return {bind(...a){args=a;return this},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}}}}},async batch(list){return Promise.all(list.map(s=>s.run()))}}};`);
function compile(file,name,replacements={}){let code=fs.readFileSync(file,'utf8');for(const [from,to] of Object.entries(replacements))code=code.replaceAll(from,to);fs.writeFileSync(dir+'/'+name+'.mjs',ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText)}
compile('app/tasting-scale.ts','tasting-scale');compile('app/wine-styles.ts','wine-styles');compile('app/personal-taste.ts','personal', {"'./tasting-scale'":"'./tasting-scale.mjs'"});compile('app/personal-ranking.ts','personal-ranking', {"'./personal-taste'":"'./personal.mjs'","'./wine-styles'":"'./wine-styles.mjs'"});compile('app/flavor.ts','flavor',{"'./personal-taste'":"'./personal.mjs'","'./wine-styles'":"'./wine-styles.mjs'"});compile('app/admin-auth.ts','admin-auth',{"'cloudflare:workers'":"'./context.mjs'"});compile('app/api/club/route.ts','club',{"'cloudflare:workers'":"'./context.mjs'","'../../chatgpt-auth'":"'./context.mjs'","'../../admin-auth'":"'./admin-auth.mjs'","'../../wine-styles'":"'./wine-styles.mjs'","'../../flavor'":"'./flavor.mjs'","'../../personal-ranking'":"'./personal-ranking.mjs'","import seedCatalog from '../../../data/discoveries.json';":'const seedCatalog='+fs.readFileSync('data/discoveries.json','utf8')+';'});compile('app/api/admin/route.ts','admin',{"'cloudflare:workers'":"'./context.mjs'","'../../chatgpt-auth'":"'./context.mjs'","'../../admin-auth'":"'./admin-auth.mjs'"});
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
