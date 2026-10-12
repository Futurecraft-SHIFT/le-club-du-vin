import initial from '../data/discoveries.json';
export type CatalogEntry=typeof initial[number]&{price?:number|null;currency?:string;priceCheckedAt?:string;available?:boolean};
export const wines:CatalogEntry[]=[...initial];
let pending:Promise<void>|null=null;
export function hydrateCatalog(){return pending??=(async()=>{try{const r=await fetch('/api/catalog');if(!r.ok)return;const data:any=await r.json();const merged=new Map(wines.map(w=>[w.id,w]));for(const w of data.wines||[])if(w.id&&w.name&&w.producer)merged.set(w.id,{...merged.get(w.id),...w});wines.splice(0,wines.length,...merged.values())}catch{/* The last bundled index remains usable offline. */}})()}
