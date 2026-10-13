"use client";
import {useState} from 'react';
import {Wine} from 'lucide-react';
import WineGraphic from './wine-graphic';
import {wineFamily} from './wine-styles';

// Presentation only: the original uploaded photograph remains untouched.
export default function BottleArtwork({src,name,style,uploaded=false}:{src?:string;name:string;style:string;uploaded?:boolean}){
 const [failed,setFailed]=useState<string|null>(null);
 return <div className={'registered-artwork'+(uploaded?' uploaded-artwork':' catalog-artwork')}>
  <WineGraphic style={wineFamily(style)}/>
  {src&&failed!==src?<div className="registered-photo-crop"><img src={src} alt={name+' · bottle photograph'} referrerPolicy="no-referrer" onError={()=>setFailed(src)}/></div>:<div className="registered-photo-empty"><Wine size={56} strokeWidth={1}/><span>{src?'Photo unavailable':'No bottle photo yet'}</span></div>}
 </div>;
}
