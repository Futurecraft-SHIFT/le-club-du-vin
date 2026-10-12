export const WINE_STYLES=['Red','Classic Red','Natural Red','White','Classic White','Natural White','Orange','Rosé','Natural Rosé','Sparkling','Classic Bubbles','Natural Bubbles','Pét-nat','Ancestral'] as const;
export function wineFamily(style:string){return /red/i.test(style)?'Red':/white/i.test(style)?'White':/orange/i.test(style)?'Orange':/rosé/i.test(style)?'Rosé':'Sparkling'}
export function styleLabel(style:string){return ['Red','White','Sparkling'].includes(style)?style+' · method unspecified':style}
