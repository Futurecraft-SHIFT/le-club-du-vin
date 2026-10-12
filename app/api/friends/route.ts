import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {friendship,areFriends,writeFriendship,friendIds} from '../../friendships';
import {flavor,winePalette} from '../../flavor';
import {personalDiscoveries} from '../../personal-ranking';
import {wineFamily} from '../../wine-styles';
import seed from '../../../data/discoveries.json';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req:Request){try{
 const user=await getChatGPTUser();if(!user)return reply({error:'Please sign in.'},401);const db=env.DB!,url=new URL(req.url),id=url.searchParams.get('profile');
 if(id){
  if(!await areFriends(user.userId,id))return reply({error:'Accept a friend request before viewing this profile.'},403);
  const profile=await db.prepare('SELECT id,name FROM profiles WHERE id=?').bind(id).first();if(!profile)return reply({error:'Profile unavailable.'},404);
  const bottles=await db.prepare('SELECT id,name,producer,vintage,style,region,grapes,count,photo_key FROM bottles WHERE owner=? ORDER BY created_at DESC').bind(id).all();
  const rows=await db.prepare('SELECT t.axes,t.score,t.notes,b.name,b.producer,b.style,b.grapes FROM tastings t JOIN bottles b ON b.id=t.bottle_id WHERE t.user_id=?').bind(id).all();
  const live=await db.prepare('SELECT data FROM catalog_entries').all<{data:string}>();const catalog=new Map(seed.map(w=>[w.id,w]));for(const row of live.results){const w=JSON.parse(row.data);catalog.set(w.id,{...catalog.get(w.id),...w})}
  const occasion=url.searchParams.get('occasion')==='celebration'?'celebration':'dinner';
  const suggestions=personalDiscoveries(rows.results as any,[...catalog.values()],200).filter(w=>!bottles.results.some((b:any)=>b.name===w.name&&b.producer===w.producer));
  if(occasion==='celebration')suggestions.sort((a,b)=>(b.score*(wineFamily(b.style)==='Sparkling'?1.2:1))-(a.score*(wineFamily(a.style)==='Sparkling'?1.2:1)));
  return reply({profile,bottles:bottles.results,values:flavor(rows.results as any),palette:winePalette(rows.results as any),count:rows.results.length,recommendations:suggestions.map(({reasons,...w})=>({...w,reason:'Connected to grapes, producers or wine styles they have enjoyed. Their private tasting notes stay private.'}))});
 }
 const profile=await db.prepare('SELECT share_id FROM profiles WHERE id=?').bind(user.userId).first<{share_id:string}>();const ids=await friendIds(user.userId);
 const friends=await Promise.all(ids.map(async id=>{const relation=await friendship(user.userId,id);if(!relation||relation.status==='removed')return null;const p=await db.prepare('SELECT id,name FROM profiles WHERE id=?').bind(id).first();return p?{...p,status:relation.status,direction:relation.requester===user.userId?'outgoing':'incoming'}:null}));return reply({inviteCode:profile?.share_id,friends:friends.filter(Boolean)});
 }catch{return reply({error:'Could not load friends. Please retry.'},503)}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Invalid origin.'},403);
 const user=await getChatGPTUser();if(!user)return reply({error:'Please sign in.'},401);const text=await req.text();if(text.length>2000)return reply({error:'Request too large.'},413);const input=JSON.parse(text),now=new Date().toISOString();
 if(input.action==='request'){
  if(typeof input.code!=='string'||input.code.length>100)return reply({error:'Enter a friend code.'},400);
  const other=await env.DB!.prepare('SELECT id FROM profiles WHERE share_id=?').bind(input.code.trim()).first<{id:string}>();if(!other||other.id===user.userId)return reply({error:'Ask your friend for their code and try again.'},400);
  const old=await friendship(user.userId,other.id);if(old&&old.status!=='removed')return reply({ok:true});
  await writeFriendship({requester:user.userId,recipient:other.id,status:'pending',updatedAt:now});return reply({ok:true});
 }
 if(typeof input.id!=='string'||input.id.length>200)return reply({error:'Invalid friend.'},400);const relation=await friendship(user.userId,input.id);if(!relation||![relation.recipient,relation.requester].includes(user.userId))return reply({error:'Request unavailable.'},404);
 if(input.action==='accept'){if(relation.recipient!==user.userId||relation.status!=='pending')return reply({error:'Only the recipient can accept a pending request.'},403);await writeFriendship({...relation,status:'accepted',updatedAt:now});return reply({ok:true})}
 if(input.action==='remove'){await writeFriendship({...relation,status:'removed',updatedAt:now});return reply({ok:true})}
 return reply({error:'Invalid action.'},400);
 }catch{return reply({error:'Friend request could not be saved. Please retry.'},503)}}
