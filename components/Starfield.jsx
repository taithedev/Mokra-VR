// Deterministic positions keep server and client markup identical.
const seeded=(n)=>{let x=(n*1664525+1013904223)>>>0;return x/4294967296;};
const stars=Array.from({length:155},(_,i)=>({
  left:(seeded(i*3+14)*100).toFixed(3)+'%',
  top:(seeded(i*5+43)*100).toFixed(3)+'%',
  size:(.7+seeded(i*7+18)*2.2).toFixed(2)+'px',
  delay:(-seeded(i*11+4)*9).toFixed(2)+'s',
  duration:(3.3+seeded(i*13+19)*6).toFixed(2)+'s',
  tint:i%13===0?'rose':i%7===0?'cyan':'white'
}));
export default function Starfield(){
 return <div className="mk-global-stars" aria-hidden="true">
   {stars.map((star,i)=><i key={i} className={'mk-global-stars__star '+star.tint}
     style={{left:star.left,top:star.top,width:star.size,height:star.size,animationDelay:star.delay,animationDuration:star.duration}}/>)}
 </div>;
}
