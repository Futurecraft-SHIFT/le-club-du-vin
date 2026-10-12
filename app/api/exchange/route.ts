import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
export async function GET(){
 const key='public-reference-rates/usd.json';
 try{
  const cached=await env.BUCKET!.get(key);const old:any=cached?await cached.json():null;
  if(old&&Date.now()-old.fetchedAt<86400000)return Response.json(old);
  const response=await fetch('https://api.frankfurter.dev/v2/rates?base=USD&quotes=EUR,GBP,CHF,CAD,AUD',{signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Rates unavailable');const rows:any=await response.json();
  if(!Array.isArray(rows)||!rows.length)throw Error('Invalid rates');
  const rates:Record<string,number>={USD:1};let date='';
  for(const row of rows)if(typeof row.quote==='string'&&Number.isFinite(row.rate)&&row.rate>0){rates[row.quote.toUpperCase()]=row.rate;date=row.date}
  const result={rates,date,fetchedAt:Date.now(),source:'https://frankfurter.dev'};
  await env.BUCKET!.put(key,JSON.stringify(result),{httpMetadata:{contentType:'application/json'}});return Response.json(result);
 }catch{return Response.json({rates:{USD:1},date:null,unavailable:true})}
}
