import methods from '../data/catalog-methods.json';
import {inferWineMethod,type WineMethodInfo} from './wine-styles';
import initial from '../data/discoveries.json';
export type CatalogEntry=typeof initial[number]&{price?:number|null;currency?:string;priceCheckedAt?:string;available?:boolean}&WineMethodInfo;
function enrich(w:CatalogEntry):CatalogEntry{const recorded=(methods as Record<string,WineMethodInfo>)[w.source];return {...inferWineMethod(w.style+' '+w.name),...recorded,...w,production:w.production||recorded?.production||inferWineMethod(w.style+' '+w.name).production,sparklingMethod:w.sparklingMethod||recorded?.sparklingMethod||inferWineMethod(w.style+' '+w.name).sparklingMethod}}
export const wines:CatalogEntry[]=initial.map(enrich);
let pending:Promise<void>|null=null;
export function hydrateCatalog(){return pending??=(async()=>{try{const r=await fetch('/api/catalog');if(!r.ok)return;const data:any=await r.json();const merged=new Map(wines.map(w=>[w.id,w]));for(const w of data.wines||[])if(w.id&&w.name&&w.producer)merged.set(w.id,enrich({...merged.get(w.id),...w}));wines.splice(0,wines.length,...merged.values())}catch{/* The last bundled index remains usable offline. */}})()}
