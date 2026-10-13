import type {Tasting} from './flavor';
import {flavor,AXES} from './flavor';
import {readExperience} from './personal-taste';
const join=(items:string[])=>items.length<2?items[0]||'':items.slice(0,-1).join(', ')+' and '+items.at(-1);
const traits:[RegExp,string][]=[[/\b(juicy|fruity|fruit|berries|berry)\b/i,'juicy fruit'],[/\b(mineral|minerality|stony|saline)\b/i,'a mineral edge'],[/\b(crisp|fresh|tense|tension|zippy|bright)\b/i,'freshness and energy'],[/\b(oaky|oak|woody|toasty|vanilla)\b/i,'a little oak character'],[/\b(grip|grippy|tannic|tannins)\b/i,'texture and grip'],[/\b(silky|smooth|soft)\b/i,'a smooth texture'],[/\b(bitter|bitterness)\b/i,'a bitter little twist'],[/\b(long finish|lingering)\b/i,'a finish that hangs around'],[/\b(light|delicate)\b/i,'a lighter touch'],[/\b(full.bodied|rich|weighty)\b/i,'richness and body']];
function sentiment(notes:string){
 const text=notes.replace(/[’]/g,"'");
 const negative=/\b(not (?:good|nice|for me)|did(?:n't| not) (?:like|enjoy)|don'?t like|dislike|hate|hated|too (?:sour|sweet|oaky|heavy))\b/i.test(text);
 const positive=/\b(lov(?:e|ed)|enjoy(?:ed)?|delicious|good|great|nice|favorite|favourite|would (?:buy|drink) again)\b/i.test(text);
 return negative?(positive?'mixed':'negative'):positive?'positive':'neutral';
}
export function palatePortrait(entries:Tasting[]){
 const unique=[...new Map(entries.map(e=>[e.bottle_id,e])).values()];
 const liked=unique.filter(e=>{const s=sentiment(e.notes||'');return s==='positive'||(s==='neutral'&&!e.id.startsWith('note-')&&e.score>=3.5)}).sort((a,b)=>Number(sentiment(b.notes)==='positive')-Number(sentiment(a.notes)==='positive')||b.score-a.score);
 const dislikes=unique.flatMap(e=>readExperience(e.notes||'').dislikes).slice(0,2);
 if(!unique.length)return {title:'Your next sip starts the story.',paragraphs:['Tell us what made you smile, what felt too much, and whether you would pour it again. Your palate portrait will grow from those little details.'],quote:'I’m still exploring. Ask me after my next good bottle.',early:true};
 const counts=new Map<string,number>();
 for(const e of liked){const safe=(e.notes||'').split(/[.!?;]|\bbut\b/i).filter(s=>! /\b(no|not|too|without|dislike|hate|didn.t|don.t)\b/i.test(s)).join(' ');for(const [pattern,label] of traits)if(pattern.test(safe))counts.set(label,(counts.get(label)||0)+1)}
 const words=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([label])=>label);
 const styles=[...new Set(liked.map(e=>e.style.toLowerCase()))].slice(0,2);
 const favorite=liked[0];
 const paragraphs:string[]=[];
 if(words.length)paragraphs.push('You seem happiest when a wine brings '+join(words)+'. A little personality in the glass goes a long way with you.');
 else if(favorite)paragraphs.push('Your '+(sentiment(favorite.notes)==='positive'?'own words':'scores')+' put '+favorite.name+' near the front of the queue. '+(liked.length>1?'There is more than one route to your good glass.':'That is our first clue, rather than a lifetime contract with one kind of wine.'));
 else paragraphs.push('Your notes are still drawing the boundaries. There is no clear favourite yet, and we will not turn a bottle you merely tried into a wine you love.');
 if(favorite&&words.length)paragraphs.push(favorite.name+' is a clue: '+(sentiment(favorite.notes)==='positive'?'you wrote about it positively':'you rated it '+Math.round(favorite.score*20)+'/100')+'. '+(styles.length>1?'Your happy place already stretches across '+join(styles)+'.':'For now, '+styles[0]+' has earned a place in the conversation.'));
 if(dislikes.length)paragraphs.push('Your own warning labels: '+dislikes.map(s=>'“'+s+'”').join(' and ')+'. The next recommendation should pay attention to those, too.');
 const measured=liked.filter(e=>!e.id.startsWith('note-'));if(measured.length){const axes=flavor(measured);const ranked=axes.map((v,i)=>({v,name:AXES[i].toLowerCase()})).sort((a,b)=>b.v-a.v);if(ranked[0].v-ranked.at(-1)!.v>0.5)paragraphs.push('In the wines you enjoyed, '+join(ranked.slice(0,2).map(a=>a.name))+' stand out in your recorded flavor profiles. That describes what you noticed; your comments tell us how it felt.');}
 const quote=words.length?'I like wines with '+join(words)+'. '+(styles.length?'Lately, '+join(styles)+' have been catching my attention. ':'')+'Something with a bit of a story to tell, even if I don’t know all the wine words.':favorite?'I’ve been enjoying '+join(styles)+'. '+favorite.name+' is a good starting point if you’re choosing for me. I’m still working out exactly what makes it click.':'I’m still finding my kind of wine. I can tell you what did not click, but I’m keeping an open glass.';
 return {title:words.length?'A little character, please.':favorite?'Your kind of good.':'An open glass. An open mind.',paragraphs,quote,early:unique.length<5};
}
