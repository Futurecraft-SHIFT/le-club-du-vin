export function percentages(values:number[]):number[]{
 const safe=values.map(v=>Number.isFinite(v)?Math.max(0,v):0),sum=safe.reduce((a,b)=>a+b,0);
 const raw=safe.map(v=>sum?v/sum*100:100/safe.length),out=raw.map(Math.floor);
 const order=raw.map((v,i)=>({i,f:v-out[i]})).sort((a,b)=>b.f-a.f||a.i-b.i);
 for(let n=100-out.reduce((a,b)=>a+b,0),i=0;i<n;i++)out[order[i%order.length].i]++;
 return out;
}
export function redistribute(values:number[],index:number,value:number){
 const target=Math.max(0,Math.min(100,Math.round(value))),others=values.filter((_,i)=>i!==index);
 const weights=percentages(others),raw=weights.map(v=>v*(100-target)/100),out=raw.map(Math.floor);
 const order=raw.map((v,i)=>({i,f:v-out[i]})).sort((a,b)=>b.f-a.f||a.i-b.i);
 for(let n=100-target-out.reduce((a,b)=>a+b,0),i=0;i<n;i++)out[order[i].i]++;
 out.splice(index,0,target);return out;
}
