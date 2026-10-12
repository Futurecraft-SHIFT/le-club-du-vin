'use client';
import {useEffect,useState} from 'react';
const KEY='club-usage-consent-v1';
export function track(kind:'visit'|'discovery'|'section',section?:string){try{if(localStorage.getItem(KEY)!=='yes')return;let id=crypto.randomUUID();if(kind==='visit'){const key='club-visit-'+new Date().toISOString().slice(0,10);id=sessionStorage.getItem(key)||id;sessionStorage.setItem(key,id)}void fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,kind,section,consent:true})}).catch(()=>{})}catch{}}
export function AnalyticsConsent({settings=false}:{settings?:boolean}){const [choice,setChoice]=useState<string|null>('loading');useEffect(()=>{try{setChoice(localStorage.getItem(KEY))}catch{setChoice('no')}},[]);
 function choose(allowed:boolean){const value=allowed?'yes':'no';try{localStorage.setItem(KEY,value)}catch{}setChoice(value);void fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'consent',allowed})}).catch(()=>{});if(allowed)track('visit')}
 if(!settings&&choice!==null)return null;
 return <div className={settings?'consent-settings':'consent-inline'}><p>{settings?'Optional usage statistics':'Help improve the club?'} <span>Share anonymous visit and feature counts. No notes, emails or location. No data sales enabled.</span></p>{settings&&<p className="small">Current choice: {choice==='yes'?'Allowed':'Not allowed'}. You can change it here.</p>}<div><button type="button" onClick={()=>choose(true)} className="text-button">Allow statistics</button><button type="button" onClick={()=>choose(false)} className="text-button">{settings?'Disable statistics':'No thanks'}</button></div></div>
}
