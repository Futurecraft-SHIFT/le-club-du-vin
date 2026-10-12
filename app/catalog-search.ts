import {wines} from './catalog-data';
export type CatalogWine=typeof wines[number];
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function near(a:string,b:string){if(a.length<4||Math.abs(a.length-b.length)>1)return false;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+Number(a[i-1]!==b[j-1]));prev=row}return prev[b.length]<=1}
const getIndex=()=>wines.map(w=>({wine:w,name:norm(w.name),text:norm(`${w.name} ${w.producer} ${w.grapes} ${w.region}`)}));
export function searchCatalog(query:string){const q=norm(query),tokens=q.split(' ');if(q.length<2)return [];return getIndex().map(w=>({wine:w.wine,score:tokens.reduce((n,t)=>n+(w.name.includes(t)?6:w.text.includes(t)?3:w.text.split(' ').some(word=>near(t,word))?1:-20),0)+(w.name===q?20:0)})).filter(w=>w.score>0).sort((a,b)=>b.score-a.score).slice(0,6).map(w=>w.wine)}
