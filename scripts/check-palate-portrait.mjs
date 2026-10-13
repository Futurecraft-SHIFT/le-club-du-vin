import fs from 'node:fs';import ts from 'typescript';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const dir='.sites-runtime/portrait-tests';fs.mkdirSync(dir,{recursive:true});
for(const name of ['palate-portrait','flavor','personal-taste','tasting-scale','wine-styles']){let source=fs.readFileSync('app/'+name+'.ts','utf8').replace(/from '(\.\/[^']+)'/g,"from '$1.mjs'");fs.writeFileSync(dir+'/'+name+'.mjs',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText)}
const {palatePortrait}=await import(pathToFileURL(process.cwd()+'/'+dir+'/palate-portrait.mjs'));
const bottle={id:'t1',bottle_id:'b1',name:'Test wine',producer:'Producer',style:'Natural White',vintage:'2026',date:'2026-10-11',score:4,axes:'[3.7,1.3,1.7,1.2,0.6,1.5]',notes:'A very good white wine. Mineral, tense and oaky.'};
assert.match(palatePortrait([]).quote,/still exploring/);
assert.match(palatePortrait([bottle]).quote,/mineral edge/);
assert.match(palatePortrait([bottle]).quote,/oak character/);
assert.doesNotMatch(palatePortrait([{...bottle,score:5,notes:'Not good. Too oaky. Did not enjoy.'}]).quote,/been enjoying|like wines with/);
assert.doesNotMatch(palatePortrait([{...bottle,notes:'Loved it, but too oaky.'}]).quote,/oak character/);
assert.doesNotMatch(palatePortrait([{...bottle,id:'note-b1',notes:'A bottle from France.'}]).quote,/been enjoying/);
assert.equal(palatePortrait([bottle,bottle,bottle,bottle,bottle]).early,true);
assert.match(palatePortrait([{...bottle,notes:''}]).quote,/Test wine/);
console.log('PASS: empty history, personal descriptors, negative comments override high score, mixed notes, neutral bottle notes, duplicate tasting count, score fallback.');
