'use client';
import { useEffect,useRef,useState,useId } from 'react';
import {percentages} from './tasting-scale';
import { AXES,EXPLAIN,WineColor,paletteStops } from './flavor';
function point(i:number,r:number){const a=i*Math.PI/3-Math.PI/2;return [250+Math.cos(a)*r,240+Math.sin(a)*r]}
function smooth(v:number[],scale:number){const p=v.map((x,i)=>point(i,Math.min(1,x/scale)*165));return p.map((b,i)=>{const a=p[(i+5)%6],c=p[(i+1)%6],d=p[(i+2)%6];return `${i===0?`M ${b[0]} ${b[1]} `:''}C ${b[0]+(c[0]-a[0])/5} ${b[1]+(c[1]-a[1])/5}, ${c[0]-(d[0]-b[0])/5} ${c[1]-(d[1]-b[1])/5}, ${c[0]} ${c[1]}`}).join(' ')+' Z'}
export default function Radar({values,compare,palette=[],label='Your flavor portrait'}:{values:number[];compare?:number[];palette?:WineColor[];label?:string}){
 values=values.some(v=>v>0)?percentages(values):values;compare=compare?percentages(compare):undefined;
 const scale=Math.max(20,Math.ceil(Math.max(...values,...(compare||[]))/10)*10);
 const gradientId='wine-'+useId().replaceAll(':','');
 const [display,setDisplay]=useState(values.map(()=>0));const previous=useRef(display);const [active,setActive]=useState(0);
 useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setDisplay(values);previous.current=values;return}const start=performance.now(),from=previous.current;let frame:number;function tick(now:number){const t=Math.min(1,(now-start)/850),ease=1-(1-t)**3;const next=values.map((v,i)=>from[i]+(v-from[i])*ease);previous.current=next;setDisplay(next);if(t<1)frame=requestAnimationFrame(tick)}frame=requestAnimationFrame(tick);return ()=>cancelAnimationFrame(frame)},[values.join(',')]);
 return <div className="radar-wrap"><svg viewBox="0 0 500 490" className="radar" role="img" aria-label={`${label}: ${AXES.map((s,i)=>`${s} ${values[i]} percent`).join(', ')}`}>
 <defs><linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">{paletteStops(palette).map((s,i)=><stop key={i} offset={s.offset+'%'} stopColor={s.color}/>)}</linearGradient></defs>
 {[.25,.5,.75,1].map(r=><circle key={r} cx="250" cy="240" r={165*r} fill="none" stroke="currentColor" opacity=".2" strokeDasharray="2 5"/>)}
 {AXES.map((_,i)=>{const p=point(i,170);return <line key={i} x1="250" y1="240" x2={p[0]} y2={p[1]} stroke="currentColor" opacity=".2"/>})}
 {compare&&<path d={smooth(compare,scale)} className="comparison-shape"/>}<path d={smooth(display,scale)} className="flavor-shape" style={{fill:`url(#${gradientId})`,stroke:palette[0]?.color||'#aa9eae'}}/>
 {AXES.map((name,i)=>{const p=point(i,Math.min(1,display[i]/scale)*165),text=point(i,208);return <g key={name} className={`radar-axis ${active===i?'selected':''}`} role="button" tabIndex={0} aria-label={`${name}: ${values[i]} percent. ${EXPLAIN[i]}`} onMouseEnter={()=>setActive(i)} onFocus={()=>setActive(i)} onClick={()=>setActive(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setActive(i)}}}><circle cx={p[0]} cy={p[1]} r={active===i?10:6} fill="var(--yellow)" stroke="var(--ink)" strokeWidth="2"/><text x={text[0]} y={text[1]} textAnchor="middle">{name.toUpperCase()}</text><text className="axis-number" x={text[0]} y={text[1]+22} textAnchor="middle">{values[i]+'%'}</text></g>})}
 </svg><p className="radar-scale">Outer ring {scale}% · relative flavor balance</p><div className="axis-explanation" aria-live="polite"><strong>{AXES[active]} <span>{values[active]}%</span></strong><p>{EXPLAIN[active]}</p></div></div>
}
