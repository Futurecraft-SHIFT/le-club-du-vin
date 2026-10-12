'use client';
import {useMemo} from 'react';
import {wines} from './catalog-data';
import {Tasting} from './flavor';
import {enjoyment,readExperience} from './personal-taste';
export default function PersonalRecommendations({tastings,onStore}:{tastings:Tasting[];onStore:(s:string)=>void}){
 const suggestions=useMemo(()=>{
  const matches=tastings.map(t=>({t,w:wines.find(w=>w.name.toLowerCase()===t.name.toLowerCase()&&w.producer.toLowerCase()===t.producer.toLowerCase())}));
  return wines.filter(w=>!matches.some(m=>m.t.name===w.name&&m.t.producer===w.producer)).map(w=>{
   let score=0;const reasons:string[]=[];
   for(const {t,w:known} of matches){const preference=enjoyment(t)-3;const grapeText=t.grapes||known?.grapes||'';const grapes=grapeText==='Grapes not specified'?[]:grapeText.split(/[·,]/).map(g=>g.trim()).filter(Boolean);const shared=grapes.filter(g=>w.grapes.split(' · ').includes(g));const sameProducer=w.producer===t.producer;const connection=shared.length?3:sameProducer?2:w.style===t.style?0.4:0;score+=preference*connection;if(preference>0&&connection)reasons.push(`${shared.length?shared.join(', '):sameProducer?'Same producer':'Same wine color'} as ${t.name}, which ${readExperience(t.notes).sentiment>0?'you said you enjoyed':`you rated ${t.score}/5`}.`)}
   return {...w,score,reasons};
  }).filter(w=>w.score>0).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,3);
 },[tastings]);
 if(!tastings.length)return null;
 const dislikes=tastings.flatMap(t=>readExperience(t.notes).dislikes.map(d=>({wine:t.name,text:d})));
 return <section className="recommendations"><div className="section-heading"><div><span className="eyebrow">LEARNED FROM YOUR EXPERIENCE</span><h2>Follow your own taste.</h2></div></div><p>Your words about enjoyment take priority over ratings. These are discoveries connected to your own reviews, with no critic scores or theoretical flavor matching.</p>{dislikes.length>0&&<p className="small">What you want less of: {dislikes.slice(0,4).map(d=>`“${d.text}” (${d.wine})`).join(' · ')}. These sensations cannot yet be verified in an untasted bottle.</p>}{suggestions.length?<div className="recommendation-grid">{suggestions.map(w=><article key={w.id}><span className="eyebrow">{w.producer} · {w.style}</span><h3>{w.name}</h3><p>{w.reasons[0]}</p><p className="small">A connection to explore, not a prediction of how it will taste to you. {w.grapes}</p><button className="text-button" onClick={()=>onStore(w.producer+' '+w.name)}>Find this bottle ↗</button></article>)}</div>:<p>Still getting to know you. Tell us what you enjoyed in a bottle before we suggest another.</p>}<p className="small">Every new review can change these suggestions. No descriptions from your private journal are sent to retailers.</p></section>
}
