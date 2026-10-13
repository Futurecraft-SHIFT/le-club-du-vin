import type {CatalogWine} from './catalog-search';
import type {Tasting} from './flavor';
import {personalDiscoveries,bottleDiscoveries} from './personal-ranking';
export function priceDiscoveries(tastings:Tasting[],wines:CatalogWine[],reference:{price:number;currency:string;name?:string;producer?:string;style?:string;grapes?:string},rates:Record<string,number>,now=Date.now()){
 const ranked=reference.style&&reference.name?bottleDiscoveries(tastings,wines,{name:reference.name,producer:reference.producer||'',style:reference.style,grapes:reference.grapes},Number.MAX_SAFE_INTEGER):personalDiscoveries(tastings,wines,Number.MAX_SAFE_INTEGER);
 return rankedPriceDiscoveries(ranked,reference,rates,now);
}
export function rankedPriceDiscoveries<T extends CatalogWine>(ranked:T[],reference:{price:number;currency:string},rates:Record<string,number>,now=Date.now()){
 const priced=ranked.flatMap(w=>{
  if(!w.price||!w.currency||w.available!==true||!w.priceCheckedAt||now-Date.parse(w.priceCheckedAt)>7*86400000||!Number.isFinite(Date.parse(w.priceCheckedAt)))return [];
  const rate=w.currency===reference.currency?1:rates[reference.currency]/rates[w.currency];
  return Number.isFinite(rate)&&rate>0?[{...w,convertedPrice:Math.round(w.price*rate*100)/100,converted:w.currency!==reference.currency}]:[];
 });
 return [
  {tier:'A little less',description:'Below 85% of your shop price',wine:priced.find(w=>w.convertedPrice<reference.price*.85)},
  {tier:'Your familiar range',description:'Within 15% of your shop price',wine:priced.find(w=>w.convertedPrice>=reference.price*.85&&w.convertedPrice<=reference.price*1.15)},
  {tier:'Something extra',description:'Above 115% of your shop price',wine:priced.find(w=>w.convertedPrice>reference.price*1.15)}
 ];
}
