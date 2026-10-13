'use client';
import {recommendationStyle} from './wine-styles';

import {useEffect,useMemo,useState} from 'react';

import {wines} from './catalog-data';

import {Tasting} from './flavor';

import type {Bottle} from './ui';

import {personalDiscoveries,bottleDiscoveries} from './personal-ranking';

import {priceDiscoveries} from './price-recommendations';

import {money} from './price-types';

function RecommendationActions({wine,onStore}:{wine:{name:string;producer:string;source:string};onStore:(s:string)=>void}){
 return <div className="recommendation-actions"><a className="button dark" href={wine.source} target="_blank" rel="noopener noreferrer" aria-label={'Buy '+wine.name+' online (opens merchant website)'}>Buy online ↗</a><button className="text-button" onClick={()=>onStore(wine.producer+' '+wine.name)}>Find nearby shops ↗</button></div>;
}

export default function PersonalRecommendations({tastings,bottles=[],onStore}:{tastings:Tasting[];bottles?:Bottle[];onStore:(s:string)=>void}){

 const priced=bottles;

 const [retail,setRetail]=useState<Record<string,any[]>>({}),[busy,setBusy]=useState(''),[lookupError,setLookupError]=useState<Record<string,string>>({});

 const [referenceId,setReferenceId]=useState(''),[exchange,setExchange]=useState<{rates:Record<string,number>;date?:string}>({rates:{USD:1}});

 const bottle=priced.find(b=>b.id===referenceId)||priced[0];

 const found=bottle?retail[bottle.id]?.[0]:null;

 const reference=bottle?.purchase_context==='Shop'&&bottle.price!=null&&bottle.price>0?bottle:found?{...bottle,price:found.price,currency:found.currency}:null;

 async function research(){if(!bottle)return;const selected=bottle;setBusy(selected.id);setLookupError(e=>({...e,[selected.id]:''}));try{const response=await fetch('/api/retail-reference',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:selected.name,producer:selected.producer})});const data:any=await response.json();if(!response.ok)throw Error(data.error||'Lookup failed');setRetail(r=>({...r,[selected.id]:data.references}));if(!data.references.length)setLookupError(e=>({...e,[selected.id]:'No matching shop listing found in the connected merchants. Try again later; your restaurant price has not been used as a retail price.'}));}catch(e){setLookupError(r=>({...r,[selected.id]:e instanceof Error?e.message:'Please retry.'}))}finally{setBusy('')}}

 useEffect(()=>{if(!reference)return;let active=true;fetch('/api/exchange').then(r=>r.json()).then((d:any)=>{if(active&&d.rates)setExchange(d)}).catch(()=>{});return()=>{active=false}},[reference?.currency]);

 const suggestions=useMemo(()=>bottle?bottleDiscoveries(tastings,wines,bottle):personalDiscoveries(tastings,wines),[tastings,bottle]);

 const tiers=reference?priceDiscoveries(tastings,wines,{price:reference.price!,currency:reference!.currency||'EUR',name:bottle.name,producer:bottle.producer,style:bottle.style,grapes:bottle.grapes},exchange.rates):null;

 if(!tastings.length)return null;

 return <section className="recommendations"><div className="section-heading"><div><span className="eyebrow">LEARNED FROM YOUR EXPERIENCE</span><h2>Your taste. Three possibilities.</h2></div></div><p>{bottle?`Exploring ${bottle.style.toLowerCase()} wines like ${bottle.name}, refined by your personal taste. Then a little less, a similar shop price, and something extra.`:'Your own enjoyment guides your next discoveries.'}</p>

 {bottle&&<><label className="budget-reference">Compare with this bottle<select value={bottle.id} onChange={e=>setReferenceId(e.target.value)}>{priced.map(b=><option key={b.id} value={b.id}>{b.name} · {b.vintage} · {b.price?money(b.price,b.currency||'EUR')+' · '+(b.purchase_context||'Other'):'Price not recorded'}</option>)}</select></label>{bottle.purchase_context!=='Shop'||!bottle.price?<div className="retail-reference"><p>Find a shop price for this bottle to compare a little less, a similar price and something extra.</p><button className="button dark" disabled={!!busy} onClick={research}>{busy===bottle.id?'Checking shop prices…':found?'Refresh shop price':'Find its shop price'}</button><p className="small">Searches MYSA and MORE Natural Wine, supplemented by recently reviewed shop listings. Only the bottle name and producer are used.</p>{found&&<p>Retail reference: <strong>{money(found.price,found.currency)}</strong> · {found.title} · vintage {found.vintage}. <a href={found.source} target="_blank" rel="noreferrer">{found.sourceLabel} ↗</a> · checked {found.checkedAt.slice(0,10)}. A different vintage may cost differently.</p>}{lookupError[bottle.id]&&<p role="status">{lookupError[bottle.id]}</p>}</div>:null}</>}



 {tiers?<><div className="recommendation-grid">{tiers.map(({tier,description,wine:w})=><article key={tier}><span className="eyebrow">{tier}</span><p className="small">{description}</p>{w?<><h3>{w.name}</h3><p>{w.producer} · {recommendationStyle(w)}</p><strong className="recommendation-price">{w.converted?'≈ ':''}{money(w.convertedPrice,reference!.currency||'EUR')}</strong><p className="small">{money(w.price!,w.currency!)} at {w.sourceLabel} · checked {w.priceCheckedAt?.slice(0,10)}{w.converted&&exchange.date?` · exchange rate ${exchange.date}`:''}</p><p>{w.reasons[0]}</p><RecommendationActions wine={w} onStore={onStore}/></>:<><h3>Still looking.</h3><p>No matching wine of this type with a recent shop price in this tier yet. We keep this slot open instead of switching to another wine type.</p></>}</article>)}</div><p className="small">Shop comparisons only. Bar and restaurant markups do not set your retail budget. Converted prices are estimates, not local shop quotes; shipping, taxes and availability may differ. Reference rates: <a href="https://frankfurter.dev" target="_blank" rel="noreferrer">Frankfurter</a>.</p></>:<><p className="small">Select any registered bottle and find its shop price to unlock the three price tiers. Your taste-based suggestions remain available while you search.</p>{!suggestions.length&&<p className="recommendation-empty">No confirmed match for this wine type yet. We keep natural, classic and sparkling methods distinct; unconfirmed bottles are not substituted.</p>}<div className="recommendation-grid">{suggestions.map(w=><article key={w.id}><span className="eyebrow">{w.producer} · {recommendationStyle(w)}</span><h3>{w.name}</h3><p>{w.reasons[0]}</p><p className="small">Price comparison not available yet.</p><RecommendationActions wine={w} onStore={onStore}/></article>)}</div></>}

 </section>

}

