import fs from 'node:fs';import ts from 'typescript';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const out='.sites-runtime/retail-check.mjs';fs.writeFileSync(out,ts.transpileModule(fs.readFileSync('app/retail-reference.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);const {retailMatch,retailVariant}=await import(pathToFileURL(process.cwd()+'/'+out));
const b={name:'Gast! Blanc',producer:'Jordan Le Guyader'};
assert.equal(retailMatch(b,{title:'Jordan le Guyader - Gast Blanc 2024'}),true);
assert.equal(retailMatch(b,{title:'Gast Blanc',vendor:'Other winery'}),false);
assert.equal(retailMatch(b,{title:'Jordan Le Guyader - Gast Blanc magnum'}),false);
assert.equal(retailVariant({variants:[{price:0,available:true},{price:2900,available:false}]}),undefined);
assert.equal(retailVariant({variants:[{price:14000,available:true,title:'Case of six'},{price:2400,available:true,title:'750ml'}]}).price,2400);
console.log('PASS: producer and bottle match; wrong producer, magnum, unavailable, zero price and cases excluded.');
