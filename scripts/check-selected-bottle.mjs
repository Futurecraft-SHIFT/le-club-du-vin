import fs from 'node:fs';import ts from 'typescript';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const dir='.sites-runtime/selected-tests';fs.mkdirSync(dir,{recursive:true});for(const name of ['personal-ranking','price-recommendations','personal-taste','tasting-scale','wine-styles']){const source=fs.readFileSync('app/'+name+'.ts','utf8').replace(/from '(\.\/[^']+)'/g,"from '$1.mjs'");fs.writeFileSync(dir+'/'+name+'.mjs',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText)}
const {priceDiscoveries}=await import(pathToFileURL(process.cwd()+'/'+dir+'/price-recommendations.mjs'));
const tasting=(style,name)=>({id:name,bottle_id:name,name,style,producer:'P',score:5,notes:'Loved it',grapes:style==='Orange'?'Muscat':'Grenache',axes:'[2,2,2,1,1,2]'});
const w=(style,price)=>({id:style+price,name:style+price,producer:'Other',style,grapes:style==='Orange'?'Muscat':'Grenache',price,currency:'EUR',available:true,priceCheckedAt:new Date().toISOString()});
const wines=[w('Red',10),w('Red',15),w('Red',25),w('Orange',12),w('Orange',16),w('Orange',24)];
const ref={name:'Desti',producer:'Cosmic',style:'Orange',grapes:'100% Muscat',price:15.5,currency:'EUR'};
const tsamples=[tasting('Orange','Desti'),...Array.from({length:8},(_,i)=>tasting('Red','Red'+i))];
assert.deepEqual(priceDiscoveries(tsamples,wines,ref,{}).map(t=>t.wine?.style),['Orange','Orange','Orange']);
assert.equal(priceDiscoveries(tsamples,wines.filter(w=>!(w.style==='Orange'&&w.price===12)),ref,{})[0].wine,undefined);
assert.ok(priceDiscoveries(tsamples,wines,ref,{})[0].wine.reasons[0].includes('like Desti'));
console.log('PASS: orange reference beats strong red history; empty tiers never switch color; explanation names selected bottle.');

const {compatibleWineType,inferWineMethod}=await import(pathToFileURL(process.cwd()+'/'+dir+'/wine-styles.mjs'));
assert.equal(compatibleWineType({style:'Natural White'},{style:'White'}),false);
assert.equal(compatibleWineType({style:'Natural White'},{style:'White',production:'natural'}),true);
assert.equal(compatibleWineType({style:'Classic White'},{style:'White',production:'natural'}),false);
assert.equal(compatibleWineType({style:'Classic Red'},{style:'Red',production:'classic'}),true);
assert.equal(compatibleWineType({style:'Natural White'},{style:'White',name:'Pet-Nat',production:'natural'}),false);
assert.equal(compatibleWineType({style:'Pét-nat'},{style:'Sparkling',sparklingMethod:'traditional',production:'natural'}),false);
assert.equal(compatibleWineType({style:'Pét-nat'},{style:'Sparkling',sparklingMethod:'ancestral',production:'natural'}),true);
assert.equal(inferWineMethod('organic biodynamic wine').production,'unknown');
console.log('PASS: natural/classic strict matching; unknown and organic-only excluded; still versus sparkling and ancestral versus traditional separated.');
