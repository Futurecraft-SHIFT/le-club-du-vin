import {distanceKm,type Place} from './nearby-wine';
// Public venue descriptions reviewed 2026-10-13; coordinates geocoded from the listed addresses.
const venues=[
 {name:'Canvis Nous',lat:41.3828819,lon:2.1817232,address:'Carrer dels Canvis Nous 8, Barcelona',website:'https://www.canvisnous.net/',focusSource:'https://www.santacole.com/es/project/canvis-nous/',wineFocus:'Reviewed wine bar · natural-wine focus'},
 {name:'Bar Super',lat:41.3855505,lon:2.1784946,address:'Plaça de Santa Caterina 3, Barcelona',website:'https://barsuper.com/main-mobile',focusSource:'https://barsuper.com/main-mobile',wineFocus:'Wine-focused restaurant · small-production wines'},
 {name:'Bar Brutal',lat:41.3852677,lon:2.1805362,address:'Carrer de la Princesa 14, Barcelona',website:'https://barbrutal.com/pages/about-bar-brutal',focusSource:'https://barbrutal.com/pages/about-bar-brutal',wineFocus:'Natural-wine bistro · extensive wine selection'},
 {name:'Señora Dolores',lat:41.3766828,lon:2.1647313,address:'Carrer del Marquès de Campo Sagrado 27, Barcelona',website:'https://xn--seoradolores-bhb.com/inicio-design-blanco-y-negro/',focusSource:'https://xn--seoradolores-bhb.com/inicio-design-blanco-y-negro/',wineFocus:'Tapas and natural-wine bar'},
];
export function reviewedWineVenues(lat:number,lon:number):Place[]{return venues.map((v,i)=>({...v,id:'reviewed-wine-'+i,kind:'drink' as const,distance:distanceKm(lat,lon,v.lat,v.lon)})).filter(v=>v.distance<=2.5)}
export function mergeWineVenues(places:Place[],reviewed:Place[]){return [...reviewed,...places.filter(p=>!reviewed.some(v=>p.kind===v.kind&&distanceKm(p.lat,p.lon,v.lat,v.lon)<.08&&p.name.toLowerCase().replace(/[^a-z0-9]/g,'').includes(v.name.toLowerCase().replace(/[^a-z0-9]/g,''))))]}
