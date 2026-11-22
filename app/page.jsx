'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useState} from 'react';
import {ArrowUpRight,ArrowRight,ChevronDown,Gamepad2,Orbit,Waves,MousePointer2,ShieldCheck} from 'lucide-react';
const Character=dynamic(()=>import('@/components/Character'),{ssr:false,loading:()=> <div className="model-loading">LOADING CREATURE...</div>});
const colors=['#d1ef7c','#67c6d0','#c09ef6','#f9a76c','#ff8198','#efefdf'];
const modes=[
 {number:'01',name:'THE DEPTHS',kind:'EXPLORATION',description:'Explore an unfamiliar underground world. Something moves in the dark.',style:'deep'},
 {number:'02',name:'LAST ONE OUT',kind:'CHASE',description:'One hunter, everyone else running. Your arms are your only way out.',style:'chase'},
 {number:'03',name:'FALLING GROUND',kind:'SURVIVAL',description:'Race over collapsing platforms. When the ground disappears, keep moving.',style:'fall'}
];
const faq=[
 ['Is Mokra playable now?','Not yet. Mokra is currently in development, and these game modes are concepts.'],
 ['Can I create an account?','Yes, after the website is deployed and its server-side Neon database connection is configured.'],
 ['How do I link the VR game?','Request an eight-character code inside the game, sign into your account here, and enter the code in the player portal.'],
 ['Can I customize my character?','You can preview and save your fur color. More cosmetics can be developed later.']
];
export default function Home(){
 const [color,setColor]=useState(colors[0]),[open,setOpen]=useState(-1);
 return <main>
 <div className="announcement"><span className="light-dot"/> A NEW WORLD IS TAKING SHAPE <span className="announce-right">2026 / DEVELOPMENT PREVIEW</span></div>
 <header className="nav wrap"><Link className="logo" href="/">M<span>/</span>KRA<span className="asterisk">✳</span></Link><nav><a href="#world">WORLD</a><a href="#modes">MODES</a><a href="#creature">PLAYER MODEL</a><a href="#faq">FAQ</a></nav><Link href="/account" className="nav-button">PLAYER PORTAL <ArrowUpRight size={17}/></Link></header>
 <section className="hero wrap">
 <div className="hero-text"><span className="overline"><span className="tiny-bar"/> MULTIPLAYER VR EXPERIENCE IN DEVELOPMENT</span><h1>GET<br/><span>LOST.</span><br/>STAY<br/><em>WILD.</em></h1><p>A strange place. Unfamiliar faces. And a thousand reasons not to look behind you.</p>
 <div className="cta-row"><a className="primary" href="#world">ENTER THE WORLD <ArrowUpRight size={19}/></a><Link className="secondary" href="/account">CREATE AN ACCOUNT <ArrowRight size={19}/></Link></div>
 <div className="hero-notes"><span>● BUILT FOR VR</span><span>ARM-DRIVEN MOVEMENT</span><span>EXPLORE TOGETHER</span></div></div>
 <div className="hero-art"><div className="orb orb-one"/><div className="orb orb-two"/><Character color={color}/><div className="model-hint"><MousePointer2 size={16}/> MOVE YOUR MOUSE. IT SEES YOU.</div></div>
 </section>
 <div className="ticker">MOVE / DISCOVER / SURVIVE <span>✳</span> NOTHING STAYS STILL <span>✳</span> MOVE / DISCOVER / SURVIVE</div>
 <section className="section wrap" id="world"><div className="section-index">01 / THE WORLD</div><div className="story-grid"><h2>NOT YOUR<br/>AVERAGE<br/><span>PLAYGROUND.</span></h2><div className="story-copy"><p className="lead">No shortcuts. No ordinary footsteps. Just you, your hands, and a world that doesn't want to be understood.</p><p>Mokra is an original VR adventure centered on arm-powered movement, strange locations, unpredictable encounters, and multiplayer exploration.</p><div className="feature-grid"><div><Orbit/><b>PHYSICAL</b><small>Push, climb, launch.</small></div><div><Waves/><b>STRANGE</b><small>Uncover new places.</small></div><div><Gamepad2/><b>TOGETHER</b><small>Bring your crew.</small></div></div></div></div></section>
 <section className="section modes" id="modes"><div className="wrap"><div className="section-index">02 / GAME MODES <span>CONCEPTS IN DEVELOPMENT</span></div><h2>THREE WAYS<br/><em>TO DISAPPEAR.</em></h2><div className="mode-grid">{modes.map(m=><article className={'mode-card '+m.style} key={m.number}><div className="mode-label">{m.number} / {m.kind}<span>CONCEPT</span></div><div className="mode-visual"><div className="ring"/><b>{m.number==='01'?'◇':m.number==='02'?'◎':'⌁'}</b></div><div className="mode-bottom"><h3>{m.name}</h3><p>{m.description}</p><small>PLANNED EXPERIENCE <ArrowUpRight size={16}/></small></div></article>)}</div></div></section>
 <section className="section wrap" id="creature"><div className="section-index">03 / MEET YOUR MOKRA <span>INTERACTIVE 3D PREVIEW</span></div><div className="creature-grid"><div className="creature-view"><Character color={color}/><span>MODEL 001 / ORIGINAL CHARACTER</span></div><div className="creature-copy"><span className="overline">YOUR CREATURE. YOUR COLOR.</span><h2>LOOK<br/>ALIVE<span>.</span></h2><p>It follows your cursor, reacts to movement, and has a personality of its own. Pick your look.</p><div className="color-title">FUR COLOR <span>{color.toUpperCase()}</span></div><div className="color-grid">{colors.map(c=><button key={c} className={'color-button '+(color===c?'chosen':'')} style={{background:c}} aria-label={'Preview '+c} aria-pressed={c===color} onClick={()=>setColor(c)}/>)}</div><Link href="/account" className="primary">SAVE MY LOOK <ArrowUpRight size={18}/></Link><small className="muted">Sign in to save your color to your Mokra profile.</small></div></div></section>
 <section className="account-banner"><div className="wrap banner-inner"><div><span>04 / YOUR IDENTITY</span><h2>ONE ACCOUNT.<br/><em>YOUR WHOLE WORLD.</em></h2><p>Make a Mokra identity, change your creature's color, and securely link your VR session with a temporary code.</p><Link className="banner-button" href="/account">OPEN PLAYER PORTAL <ArrowUpRight size={18}/></Link></div><div className="profile-art"><span>M✳</span><small>ACCOUNT / GAME / SYNC</small><b>READY TO LINK</b></div></div></section>
 <section className="section wrap" id="faq"><div className="section-index">05 / THINGS TO KNOW</div><div className="faq-layout"><h2>GOT<br/>QUESTIONS<span>?</span></h2><div>{faq.map(([q,a],i)=><div className="faq-item" key={q}><button onClick={()=>setOpen(open===i?-1:i)} aria-expanded={open===i}><small>{String(i+1).padStart(2,'0')}</small>{q}<ChevronDown size={18} className={open===i?'up':''}/></button>{open===i&&<p>{a}</p>}</div>)}</div></div></section>
 <footer><div className="wrap foot-top"><div><Link href="/" className="footer-logo">MOKRA<span>✳</span></Link><p>GO SOMEWHERE YOU SHOULDN'T.</p></div><div className="foot-links"><Link href="/account">Player portal</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="#top">Back to top</a></div></div><div className="wrap foot-bottom"><span>© {new Date().getFullYear()} MOKRA. ORIGINAL VR GAME CONCEPT.</span><span>MADE FOR THE UNEXPECTED.</span></div></footer>
 </main>;
}
