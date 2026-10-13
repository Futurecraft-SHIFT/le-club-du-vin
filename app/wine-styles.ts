export const WINE_STYLES=['Red','Classic Red','Natural Red','White','Classic White','Natural White','Orange','Rosé','Natural Rosé','Sparkling','Classic Bubbles','Natural Bubbles','Pét-nat','Ancestral'] as const;
export function wineFamily(style:string){return /red/i.test(style)?'Red':/white/i.test(style)?'White':/orange/i.test(style)?'Orange':/rosé/i.test(style)?'Rosé':'Sparkling'}
export function styleLabel(style:string){return ['Red','White','Sparkling'].includes(style)?style+' · method unspecified':style}

export type WineMethodInfo={production?:string;sparklingMethod?:string;methodSource?:string};
export function inferWineMethod(text:string):WineMethodInfo{
 const t=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const ancestral=/\b(pet[ \'-]?nat|petillant naturel|ancestral)\b/.test(t);
 const traditional=/\b(traditional method|methode traditionnelle|metodo classico)\b/.test(t);
 const natural=/\b(natural wine|vin naturel|vino naturale|vino natural|natural red|natural white|natural rose|natural bubbles)\b/.test(t);
 const classic=/\b(classic red|classic white|classic bubbles|conventional wine)\b/.test(t);
 return {production:ancestral||natural?'natural':classic?'classic':'unknown',sparklingMethod:ancestral?'ancestral':traditional?'traditional':undefined};
}
export function wineTraits(w:{style:string;name?:string}&WineMethodInfo){
 const explicit=inferWineMethod(w.style+' '+(w.name||''));
 const production=w.production&&w.production!=='unknown'?w.production:explicit.production;
 const method=w.sparklingMethod||explicit.sparklingMethod;
 const sparkling=wineFamily(w.style)==='Sparkling'||!!method;
 return {family:sparkling?'Sparkling':wineFamily(w.style),production:w.style==='Orange'?'natural':production,method,sparkling};
}
export function compatibleWineType(reference:{style:string},candidate:{style:string;name?:string}&WineMethodInfo){
 const a=wineTraits(reference),b=wineTraits(candidate);
 return a.family===b.family&&a.sparkling===b.sparkling&&(a.production==='unknown'||a.production===b.production)&&(!a.method||a.method===b.method);
}
export function recommendationStyle(w:{style:string;name?:string}&WineMethodInfo){
 const t=wineTraits(w);if(t.method==='ancestral')return 'Pét-nat / ancestral';
 if(t.family==='Orange')return 'Orange · natural';
 return (t.production==='natural'?'Natural ':t.production==='classic'?'Classic ':'')+(t.sparkling?'bubbles':t.family.toLowerCase())+(t.method==='traditional'?' · traditional method':'');
}
