import {wineFamily} from './wine-styles';
import {Tasting} from './flavor';
import {enjoyment,readExperience} from './personal-taste';
import type {CatalogWine} from './catalog-search';
export function personalDiscoveries(tastings:Tasting[],wines:CatalogWine[],limit=3){
  const matches=tastings.map(t=>({t,w:wines.find(w=>w.name.toLowerCase()===t.name.toLowerCase()&&w.producer.toLowerCase()===t.producer.toLowerCase())}));
  return wines.filter(w=>!matches.some(m=>m.t.name===w.name&&m.t.producer===w.producer)).map(w=>{
   let score=0;const reasons:string[]=[];
   for(const {t,w:known} of matches){const preference=enjoyment(t)-3;const grapeText=t.grapes||known?.grapes||'';const grapes=grapeText==='Grapes not specified'?[]:grapeText.split(/[Â·,]/).map(g=>g.trim()).filter(Boolean);const shared=grapes.filter(g=>w.grapes.split(' Â· ').includes(g));const sameProducer=w.producer===t.producer;const connection=shared.length?3:sameProducer?2:w.style===t.style?0.6:wineFamily(w.style)===wineFamily(t.style)?0.4:0;score+=preference*connection;if(preference>0&&connection)reasons.push(`${shared.length?shared.join(', '):sameProducer?'Same producer':'Same wine color'} as ${t.name}, which ${readExperience(t.notes).sentiment>0?'you said you enjoyed':`you rated ${Math.round(t.score*20)}/100`}.`)}
   return {...w,score,reasons};
  }).filter(w=>w.score>0).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,limit);
}

export function bottleDiscoveries(tastings:Tasting[],wines:CatalogWine[],reference:{name:string;producer:string;style:string;grapes?:string},limit=3){
 const family=wineFamily(reference.style);
 const pool=wines.filter(w=>wineFamily(w.style)===family&&!(w.name===reference.name&&w.producer===reference.producer));
 const ranked=personalDiscoveries(tastings,pool,Number.MAX_SAFE_INTEGER);
 const norm=(s:string)=>s.toLowerCase().replace(/\d+%/g,'').trim();
 const grapes=(reference.grapes||'').split(/[·,]/).map(norm).filter(g=>g&&g!=='grapes not specified');
 return ranked.map(w=>{const shared=grapes.filter(g=>w.grapes.split(/[·,]/).map(norm).includes(g));return {...w,referenceAffinity:shared.length,reasons:[family+' wine, like '+reference.name+'. '+(shared.length?'Also made with '+shared.join(', ')+'. ':'')+(w.reasons[0]||'')]}}).sort((a,b)=>b.referenceAffinity-a.referenceAffinity||b.score-a.score||a.name.localeCompare(b.name)).slice(0,limit);
}
