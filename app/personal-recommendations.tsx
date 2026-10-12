'use client';
import {useMemo} from 'react';
import {wines} from './catalog-data';
import {Tasting} from './flavor';
import {personalDiscoveries} from './personal-ranking';
import {enjoyment,readExperience} from './personal-taste';
export default function PersonalRecommendations({tastings,onStore}:{tastings:Tasting[];onStore:(s:string)=>void}){
 const suggestions=useMemo(()=>{
  return personalDiscoveries(tastings,wines);
 },[tastings]);
 if(!tastings.length)return null;
 const dislikes=tastings.flatMap(t=>readExperience(t.notes).dislikes.map(d=>({wine:t.name,text:d})));
 return <section className="recommendations"><div className="section-heading"><div><span className="eyebrow">LEARNED FROM YOUR EXPERIENCE</span><h2>Follow your own taste.</h2></div></div><p>Your words about enjoyment take priority over ratings. These are discoveries connected to your own reviews, with no critic scores or theoretical flavor matching.</p>{dislikes.length>0&&<p className="small">What you want less of: {dislikes.slice(0,4).map(d=>`“${d.text}” (${d.wine})`).join(' · ')}. These sensations cannot yet be verified in an untasted bottle.</p>}{suggestions.length?<div className="recommendation-grid">{suggestions.map(w=><article key={w.id}><span className="eyebrow">{w.producer} · {w.style}</span><h3>{w.name}</h3><p>{w.reasons[0]}</p><p className="small">A connection to explore, not a prediction of how it will taste to you. {w.grapes}</p><button className="text-button" onClick={()=>onStore(w.producer+' '+w.name)}>Find this bottle ↗</button></article>)}</div>:<p>Still getting to know you. Tell us what you enjoyed in a bottle before we suggest another.</p>}<p className="small">Every new review can change these suggestions. No descriptions from your private journal are sent to retailers.</p></section>
}
