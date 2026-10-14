import {wineFamily} from './wine-styles';
import {wines as entries,hydrateCatalog} from './catalog-data';
const templates:Record<string,{tag:string;character:string;pairing:string;axes:number[]}>= {
 Red:{tag:'A red worth meeting.',character:'Explore its fruit, tannin and freshness: serve a small pour, then notice how the texture changes with air.',pairing:'Style-based pairing idea: mushroom pasta or roasted vegetables.',axes:[6,5,6,3,6,6]},
 White:{tag:'A fresh direction.',character:'Start with the aromas, then look for acidity and texture. Compare the first chilled sip with another after the glass warms slightly.',pairing:'Style-based pairing idea: grilled fish or lemon-dressed vegetables.',axes:[6,1,7,2,4,5]},
 Orange:{tag:'A little skin in the game.',character:'Skin-contact whites invite you to explore texture alongside fruit. Notice any drying grip and how the wine develops in the glass.',pairing:'Style-based pairing idea: roasted squash, spiced chickpeas or aged cheese.',axes:[6,5,6,2,6,6]},
 'Rosé':{tag:'Think pink. Stay curious.',character:'Explore the balance between fruit and freshness, then pay attention to texture. Rosé can be delicate or substantial: let this bottle tell you which.',pairing:'Style-based pairing idea: a tomato salad or grilled vegetables.',axes:[6,2,7,1,4,5]},
 Sparkling:{tag:'Let the bubbles do the talking.',character:'Notice the size and persistence of the bubbles, then explore fruit and acidity beneath the fizz. A wine glass gives its aromas room to open.',pairing:'Style-based pairing idea: salty snacks or crisp vegetable tempura.',axes:[6,1,8,1,4,6]},
};
const describe=(entries:typeof import('../data/discoveries.json'))=>entries.map(w=>{const t=templates[wineFamily(w.style)],axes=[...t.axes];if(w.body?.startsWith('Light'))axes[4]=3;else if(w.body?.startsWith('Full'))axes[4]=8;return {...w,tag:t.tag,description:`${w.name} is a ${w.style.toLowerCase()} wine by ${w.producer}${w.region==='Origin not specified'?'':', from '+w.region}.${w.grapes==='Grapes not specified'?'':' The merchant lists '+w.grapes.replaceAll(' · ', ', ')+'.'} ${t.character}`,pairing:t.pairing,axes}});
export const discoveryCatalog=describe(entries);
export function drawUnseen(seen:Iterable<string>,random=Math.random){const visited=new Set(seen),remaining=discoveryCatalog.filter(w=>!visited.has(w.id));return remaining.length?remaining[Math.floor(random()*remaining.length)]:null}
// IndexedDB read/write transactions serialize across tabs. Save before revealing.
export async function discoverBottle(){
 await hydrateCatalog();discoveryCatalog.splice(0,discoveryCatalog.length,...describe(entries));
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('le-club-discoveries',1);r.onupgradeneeded=()=>r.result.createObjectStore('seen',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Enable browser storage to keep a discovery history without repeats.'))});
 return new Promise<ReturnType<typeof drawUnseen>>((resolve,reject)=>{const tx=db.transaction('seen','readwrite'),store=tx.objectStore('seen'),r=store.getAllKeys();let wine:ReturnType<typeof drawUnseen>=null;r.onsuccess=()=>{wine=drawUnseen(r.result.map(String));if(wine)store.add({id:wine.id,seenAt:Date.now()})};tx.oncomplete=()=>{db.close();resolve(wine)};tx.onabort=tx.onerror=()=>{db.close();reject(Error('Could not save discovery history. Please enable browser storage and retry.'))}});
}
