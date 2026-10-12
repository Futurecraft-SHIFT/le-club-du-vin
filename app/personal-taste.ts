import {percentages} from './tasting-scale';
// No critic scores or catalog tasting profiles enter this interpretation.
export function readExperience(notes:string){
 const text=notes.toLowerCase();
 const axes:(number|null)[]=[null,null,null,null,null,null];
 const rules:[number,RegExp,number][]=[
  [0,/\b(juicy|fruity|fruit bomb|ripe fruit)\b/,8],[0,/\b(not fruity|little fruit|no fruit)\b/,2],
  [1,/\b(grippy|drying|tannic|rough tannins)\b/,8],[1,/\b(silky|soft tannins|no tannins|not tannic)\b/,2],
  [2,/\b(crisp|tart|sour|zippy|mouth.?watering|high acidity)\b/,8],[2,/\b(low acidity|not acidic|soft acidity|flat)\b/,2],
  [3,/\b(oaky|woody|vanilla|toasty)\b/,8],[3,/\b(no oak|not oaky|unoaked)\b/,1],
  [4,/\b(full.?bodied|heavy|rich texture)\b/,8],[4,/\b(light.?bodied|delicate|light and)\b/,3],
  [5,/\b(lingering|long finish|lasts forever)\b/,8],[5,/\b(short finish|fades quickly)\b/,2],
 ];
 for(const [axis,pattern,value] of rules)if(pattern.test(text))axes[axis]=value;
 const dislikes=Array.from(text.matchAll(/\b(?:too|dislike|disliked|hate|hated|don't like|didn't like)\s+([\w -]{2,45}?)(?=[,.!;]|$)/g)).map(m=>m[0]);
 const negative=/\b(dislike|disliked|hate|hated|not for me|didn't enjoy|did not enjoy|too sour|too heavy|too sweet|too oaky)\b/.test(text);
 const positive=/\b(love|loved|enjoy|enjoyed|delicious|favorite|favourite|perfect for me|would buy again)\b/.test(text);
 return {axes,dislikes,sentiment:negative&&positive?0:negative?-1:positive?1:0};
}
export function perceivedAxes(t:{axes:string;notes?:string}){let base:number[];try{base=JSON.parse(t.axes)}catch{base=[5,5,5,5,5,5]}if(Math.abs(base.reduce((a,b)=>a+b,0)-10)<0.001)return base;const read=readExperience(t.notes||'');return percentages(base.map((v,i)=>read.axes[i]??v)).map(v=>v/10)}
export function enjoyment(t:{score:number;notes?:string}){const s=readExperience(t.notes||'').sentiment;return s<0?1:s>0?5:t.score}
