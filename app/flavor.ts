import {wineFamily} from './wine-styles';
import {perceivedAxes,enjoyment} from './personal-taste';
export const AXES=['Fruit','Tannin','Acidity','Oak','Body','Finish'];
export const EXPLAIN=[
 'The intensity of fruit aromas, from a whisper of citrus to ripe cherry and plum.',
 'The drying, grippy sensation on your gums. Think black tea, rather than bitterness.',
 'The fresh, mouth-watering lift. Higher acidity feels lively and crisp.',
 'The influence of barrel ageing: toast, vanilla, spice or wood.',
 'The weight and texture of the wine in your mouth, from light to full.',
 'How long the flavours linger after a sip. Longer does not always mean better.',
];
export type Tasting={id:string;bottle_id:string;date:string;score:number;notes:string;axes:string;name:string;style:string;vintage:string;producer:string;grapes?:string;photo_key?:string|null};
export const WINE_COLORS:Record<string,string>={Red:'#b51f3b',White:'#d9b53d',Orange:'#ed7a24','Rosé':'#e784a0',Sparkling:'#86a867','Classic Red':'#b51f3b','Natural Red':'#bc3254','Classic White':'#d9b53d','Natural White':'#dcc35d','Natural Rosé':'#e784a0','Classic Bubbles':'#86a867','Natural Bubbles':'#b4b35b','Pét-nat':'#b4b35b',Ancestral:'#b4b35b'};
export type WineColor={style:string;color:string;weight:number;count:number};
export function winePalette(tastings:{style:string;score:number;notes?:string}[]):WineColor[]{
 const totals:Record<string,{weight:number;count:number}>={};
 tastings.forEach(entry=>{const t={...entry,style:wineFamily(entry.style)};if(!WINE_COLORS[t.style])return;totals[t.style]??={weight:0,count:0};totals[t.style].weight+=Math.max(0.1,enjoyment(t))**2;totals[t.style].count++});
 const total=Object.values(totals).reduce((n,t)=>n+t.weight,0);
 return Object.entries(totals).map(([style,v])=>({style,color:WINE_COLORS[style],weight:v.weight/total,count:v.count})).sort((a,b)=>b.weight-a.weight);
}
export function paletteStops(palette:WineColor[]){
 if(!palette.length)return [{offset:0,color:'#c6b5cc'},{offset:100,color:'#e4dce7'}];
 let running=0;const stops:{offset:number;color:string}[]=[];
 palette.forEach((p,i)=>{const start=running;running+=p.weight*100;stops.push({offset:i===0?0:start+Math.min(8,p.weight*25),color:p.color});stops.push({offset:i===palette.length-1?100:running-Math.min(8,p.weight*25),color:p.color})});return stops;
}
export function paletteGradient(palette:WineColor[]){return `linear-gradient(125deg, ${paletteStops(palette).map(s=>s.color+' '+s.offset+'%').join(', ')})`}
export function flavor(tastings:(Pick<Tasting,'score'|'axes'> & {notes?:string})[]){
 if(!tastings.length)return [0,0,0,0,0,0];
 let total=0;const scores=[0,0,0,0,0,0];
 tastings.forEach(t=>{const a=perceivedAxes(t);const weight=Math.pow(Math.max(0.1,enjoyment(t)),2);total+=weight;a.forEach((v:number,i:number)=>scores[i]+=v*weight)});
 return scores.map(v=>Math.round(v/total*10)/10);
}
export const CANDIDATES=[
 {name:'Gamay · Beaujolais',type:'Juicy, light reds',axes:[8,3,7,1,3,5],pair:'Mushrooms, roast chicken or a lentil salad.'},
 {name:'Chenin Blanc · Loire',type:'Textured, lively whites',axes:[7,1,8,2,5,7],pair:'Goat cheese, grilled vegetables or fish.'},
 {name:'Skin-contact Pinot Gris',type:'A little orange adventure',axes:[6,5,6,1,6,7],pair:'Roasted squash, spiced chickpeas or hard cheese.'},
 {name:'Tempranillo · Rioja',type:'Savory, fuller reds',axes:[7,7,5,7,8,8],pair:'Grilled aubergine, lamb or aged cheese.'},
 {name:'Vinho Verde · Portugal',type:'Fresh, citrus-led whites',axes:[6,1,9,0,2,4],pair:'Seafood, fresh salads or vegetable tempura.'},
 {name:'Blaufränkisch · Austria',type:'Bright, peppery reds',axes:[7,6,8,3,6,7],pair:'Roast beetroot, lentils or grilled pork.'},
];
export function recommendations(axes:number[]){return CANDIDATES.map(c=>({...c,distance:c.axes.reduce((n,v,i)=>n+(v-axes[i])**2,0)})).sort((a,b)=>a.distance-b.distance).slice(0,3)}
export function critique(a:number[]){const high=AXES.filter((_,i)=>a[i]>=7).map(s=>s.toLowerCase());return `${high.length?'A profile led by '+high.join(', '):'A restrained, balanced profile'}. ${a[2]>=7?'The acidity brings a fresh, mouth-watering edge.':'The acidity reads as softer and rounder.'} ${a[1]>=7?'Firm tannin may suit a textured, protein-rich dish.':'Gentler tannin keeps the texture approachable.'} ${a[5]>=7?'You recorded a lingering finish.':'You recorded a shorter to medium finish.'}`}
