'use client';
import {useEffect,useMemo,useState} from 'react';
import {wines} from './catalog-data';
import {Tasting} from './flavor';
import type {Bottle} from './ui';
import {personalDiscoveries} from './personal-ranking';
import {priceDiscoveries} from './price-recommendations';
import {money} from './price-types';
export default function PersonalRecommendations({tastings,bottles=[],onStore}:{tastings:Tasting[];bottles?:Bottle[];onStore:(s:string)=>void}){
 const priced=bottles.filter(b=>b.purchase_context==='Shop'&&b.price!=null&&b.price>0);
 const [referenceId,setReferenceId]=useState(''),[exchange,setExchange]=useState<{rates:Record<string,number>;date?:string}>({rates:{USD:1}});
 const reference=priced.find(b=>b.id===referenceId)||priced[0];
 useEffect(()=>{if(!reference)return;let active=true;fetch('/api/exchange').then(r=>r.json()).then((d:any)=>{if(active&&d.rates)setExchange(d)}).catch(()=>{});return()=>{active=false}},[reference?.currency]);
 const suggestions=useMemo(()=>personalDiscoveries(tastings,wines),[tastings]);
 const tiers=reference?priceDiscoveries(tastings,wines,{price:reference.price!,currency:reference.currency||'EUR'},exchange.rates):null;
 if(!tastings.length)return null;
 return <section className="recommendations"><div className="section-heading"><div><span className="eyebrow">LEARNED FROM YOUR EXPERIENCE</span><h2>Your taste. Three possibilities.</h2></div></div><p>Your own enjoyment comes first. Then we explore a little less, your familiar price range, and something extra.</p>
 {reference&&<label className="budget-reference">Compare with this shop purchase<select value={reference.id} onChange={e=>setReferenceId(e.target.value)}>{priced.map(b=><option key={b.id} value={b.id}>{b.name} · {money(b.price!,b.currency||'EUR')}</option>)}</select></label>}
 {tiers?<><div className="recommendation-grid">{tiers.map(({tier,description,wine:w})=><article key={tier}><span className="eyebrow">{tier}</span><p className="small">{description}</p>{w?<><h3>{w.name}</h3><p>{w.producer} · {w.style}</p><strong className="recommendation-price">{w.converted?'≈ ':''}{money(w.convertedPrice,reference.currency||'EUR')}</strong><p className="small">{money(w.price!,w.currency!)} at {w.sourceLabel} · checked {w.priceCheckedAt?.slice(0,10)}{w.converted&&exchange.date?` · exchange rate ${exchange.date}`:''}</p><p>{w.reasons[0]}</p><a className="text-button" href={w.source} target="_blank" rel="noreferrer">View merchant listing ↗</a><button className="text-button" onClick={()=>onStore(w.producer+' '+w.name)}>Find nearby shops ↗</button></>:<><h3>Still looking.</h3><p>No taste-matched bottle with a recent comparable price in this tier yet. We will not invent a price or force a poor match.</p></>}</article>)}</div><p className="small">Shop comparisons only. Bar and restaurant markups do not set your retail budget. Converted prices are estimates, not local shop quotes; shipping, taxes and availability may differ. Reference rates: <a href="https://frankfurter.dev" target="_blank" rel="noreferrer">Frankfurter</a>.</p></>:<><p className="small">Add a shop price to a registered bottle to unlock the three price tiers. Gift, bar, restaurant and unknown prices are kept separate.</p><div className="recommendation-grid">{suggestions.map(w=><article key={w.id}><span className="eyebrow">{w.producer} · {w.style}</span><h3>{w.name}</h3><p>{w.reasons[0]}</p><p className="small">Price comparison not available yet.</p><button className="text-button" onClick={()=>onStore(w.producer+' '+w.name)}>Find this bottle ↗</button></article>)}</div></>}
 </section>
}
