'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,Shuffle,Wine} from 'lucide-react';
import Radar from './radar';
import WineGraphic from './wine-graphic';
import {Store} from './ui';
import {winePalette} from './flavor';

import {discoveryCatalog} from './discovery-catalog';
export default function Surprise({index,onAgain,onBack,busy,exhausted}:{index:number;onAgain:()=>void;onBack:()=>void;busy:boolean;exhausted:boolean}){
 const wine=discoveryCatalog[index],heading=useRef<HTMLHeadingElement>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{setFailed(false);heading.current?.focus({preventScroll:true})},[index]);
 return <section className="workspace surprise-page"><div className="surprise-toolbar"><button className="text-button" onClick={onBack}><ArrowLeft size={18}/> Back to the club</button><span className="eyebrow">A LITTLE LUCK. NO LOGIN NEEDED.</span></div><div className="surprise-intro"><span className="eyebrow">YOU UNCORKED…</span><h1 ref={heading} tabIndex={-1}>{wine.name}<span>{wine.vintage}</span></h1><p>{wine.tag}</p></div><div className="surprise-bottle-layout"><figure className={'surprise-photo surprise-'+wine.style}><div className="surprise-bottle-stage"><WineGraphic style={wine.style}/>{failed?<div className="photo-placeholder"><Wine size={70}/><p>Photo unavailable</p></div>:<img src={wine.photo} alt={`${wine.producer} ${wine.name} bottle`} referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>}</div><figcaption>Merchant bottle photograph · label may vary by vintage.</figcaption></figure><div className="surprise-story"><span className="eyebrow">{wine.producer}</span><h2>Meet your unexpected.</h2><dl className="surprise-facts"><div><dt>From</dt><dd>{wine.region}</dd></div><div><dt>In the bottle</dt><dd>{wine.grapes}</dd></div><div><dt>Style / alcohol</dt><dd>{wine.style}{wine.abv?" · "+wine.abv:""}</dd></div></dl><p>{wine.description}</p><p className="surprise-pairing">{wine.pairing}</p><a className="text-button" href={wine.source} target="_blank" rel="noopener noreferrer">Bottle details: {wine.sourceLabel} ↗</a><button className="button dark" disabled={busy||exhausted} onClick={onAgain}><Shuffle size={18}/> {exhausted?"All bottles explored":busy?"Uncorking…":"Uncork another bottle"}</button><span className="small">{discoveryCatalog.length.toLocaleString()} wines indexed so far in a growing catalog. No repeats in this browser’s saved history. Clearing browser data or using another device starts a new history.</span></div></div><div className="surprise-bottom"><section className="surprise-flavor"><span className="eyebrow">THE SHAPE OF THIS WINE</span><h2>Get a taste.</h2><Radar values={wine.axes} palette={winePalette([{style:wine.style,score:1}])} label={wine.name+' estimated flavor profile'}/><p className="small">Illustrative style-based flavor guide, not measured scores or a review of this specific bottle. Tap an axis to explore it.</p></section><section className="surprise-store"><span className="eyebrow">TAKE YOUR DISCOVERY HOME</span><h2>Find this bottle.</h2><Store key={index} name={`${wine.producer} ${wine.name} ${wine.vintage}`}/></section></div></section>
}


