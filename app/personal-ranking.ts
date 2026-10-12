import {Tasting} from './flavor';
import {enjoyment,readExperience} from './personal-taste';
import type {CatalogWine} from './catalog-search';
export function personalDiscoveries(tastings:Tasting[],wines:CatalogWine[]){
  const matches=tastings.map(t=>({t,w:wines.find(w=>w.name.toLowerCase()===t.name.toLowerCase()&&w.producer.toLowerCase()===t.producer.toLowerCase())}));
  return wines.filter(w=>!matches.some(m=>m.t.name===w.name&&m.t.producer===w.producer)).map(w=>{
   let score=0;const reasons:string[]=[];
   for(const {t,w:known} of matches){const preference=enjoyment(t)-3;const grapeText=t.grapes||known?.grapes||'';const grapes=grapeText==='Grapes not specified'?[]:grapeText.split(/[·,]/).map(g=>g.trim()).filter(Boolean);const shared=grapes.filter(g=>w.grapes.split(' · ').includes(g));const sameProducer=w.producer===t.producer;const connection=shared.length?3:sameProducer?2:w.style===t.style?0.4:0;score+=preference*connection;if(preference>0&&connection)reasons.push(`${shared.length?shared.join(', '):sameProducer?'Same producer':'Same wine color'} as ${t.name}, which ${readExperience(t.notes).sentiment>0?'you said you enjoyed':`you rated ${t.score}/5`}.`)}
   return {...w,score,reasons};
  }).filter(w=>w.score>0).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,3);
}
