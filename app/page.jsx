'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Compass, Fingerprint, Headphones, LockKeyhole, Menu, Mic2, MousePointer2, RadioTower, ShieldCheck, Sparkles, Users, Volume2, X } from 'lucide-react';

const Character = dynamic(() => import('@/components/Character'), { ssr: false, loading: () => <div className="mk-model-loader">ASSEMBLING SIGNAL...</div> });
const palette = ['#476bff', '#8b56ff', '#f0f0ff', '#ff6a95', '#25d7cf', '#eac96c'];
const threats = [
  { name: 'The Hush', label: 'BENEATH THE STATION', number:'01', image:'/scenes/hush.svg', text:'It never has to run. It waits where the lights forget to reach. Keep moving and do not follow the knocking.' },
  { name: 'The Sentry', label: 'WITHIN THE SIGNAL', number:'02', image:'/scenes/sentry.svg', text:'Always watching the same hallway. Until it isn’t. Listen for the static before you turn a corner.' },
  { name: 'The Pale', label: 'BEYOND THE GATE', number:'03', image:'/scenes/pale.svg', text:'An outline at the end of the corridor. The closer you get, the less familiar everything becomes.' },
];
const locations = [
  { number:'01', name:'THE STATION', tag:'EXPLORE', src:'/scenes/station.svg', desc:'Find a route through abandoned rooms and long-forgotten exits.' },
  { number:'02', name:'THE UNDERPASS', tag:'SURVIVE', src:'/scenes/underpass.svg', desc:'The lights are still on. That does not mean it is safe.' },
  { number:'03', name:'THE LOWER LEVEL', tag:'ESCAPE', src:'/scenes/lower.svg', desc:'Every hallway feels familiar until the door behind you closes.' },
];
const features = [
  {icon:Mic2, title:'Speak carefully.', desc:'Use voice chat to coordinate and stay close to your group.'},
  {icon:Users, title:'Bring your people.', desc:'Plan private rooms and public adventures with friends.'},
  {icon:Compass, title:'Learn the way.', desc:'Navigate the dark together and discover hidden routes.'},
  {icon:Fingerprint, title:'Move differently.', desc:'Climb, swing and launch with VR arm-driven locomotion.'},
  {icon:ShieldCheck, title:'Your own profile.', desc:'Make an account, choose your look and link your headset.'},
  {icon:RadioTower, title:'More to uncover.', desc:'New places, encounters and game features are planned.'},
];
const faqs = [
  ['When can I play?', 'Mokra is in active development. A release date has not been announced. The locations and encounters shown here are previews of the intended atmosphere.'],
  ['Can I make an account?', 'Yes. Your account can save a profile and character color when the site is hosted with its Neon database configured.'],
  ['How does game linking work?', 'Start linking in Mokra to receive a temporary eight-character code, then sign into the player portal and enter it to link the headset securely.'],
];

function Reveal({ children, className = '', ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { node.classList.add('mk-visible'); return; }
    const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) { node.classList.add('mk-visible'); observer.unobserve(node); } }, { threshold:.08 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`mk-reveal ${className}`} {...props}>{children}</div>;
}

function Navigation() {
  const [menu, setMenu] = useState(false);
  const [scroll, setScroll] = useState(0);
  useEffect(() => {
    const onScroll = () => setScroll(window.scrollY / Math.max(1,document.documentElement.scrollHeight - window.innerHeight));
    window.addEventListener('scroll', onScroll, { passive:true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const close = () => setMenu(false);
  return <>
    <div className="mk-progress" style={{ transform:`scaleX(${scroll})` }}/>
    <header className="mk-nav-wrap">
      <nav className="mk-nav" aria-label="Main navigation">
        <a className="mk-nav-mark" href="#top" onClick={close} aria-label="Mokra home">m<span>✳</span></a>
        <a href="#movement" onClick={close}>Move</a>
        <a href="#base" onClick={close}>Base</a>
        <a href="#threats" onClick={close}>Threats</a>
        <a href="#locations" onClick={close}>World</a>
        <a href="#community" onClick={close}>People</a>
        <Link className="mk-nav-get" href="/account">Account <ArrowUpRight size={12}/></Link>
      </nav>
      <button className="mk-mobile-menu" onClick={() => setMenu(v => !v)} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>{menu ? <X size={21}/> : <Menu size={21}/>}</button>
      {menu && <nav className="mk-mobile-links" aria-label="Mobile navigation">{[['Move','#movement'],['Base','#base'],['Threats','#threats'],['World','#locations'],['People','#community']].map(([label,href])=><a key={href} href={href} onClick={close}>{label}</a>)}<Link href="/account" onClick={close}>Player account <ArrowUpRight size={15}/></Link></nav>}
    </header>
  </>;
}

function Kicker({ children }) { return <span className="mk-kicker"><i/>{children}</span>; }

export default function Home() {
  const [selectedThreat, setSelectedThreat] = useState(0);
  const [selectedColor, setSelectedColor] = useState(palette[0]);
  const [openFaq, setOpenFaq] = useState(-1);
  const threat = threats[selectedThreat];
  return <main className="mk-site" id="top">
    <Navigation/>
    <section className="mk-hero" aria-labelledby="mk-hero-title">
      <div className="mk-hero-grain"/>
      <div className="mk-hero-model"><Character color={selectedColor}/></div>
      <div className="mk-real-model-mark" aria-label="Actual Monki 1 player model">MONKI / LIVE 3D <span>●</span> RAINBOW PARTICLES</div>
      <div className="mk-hero-ghost"/>
      <div className="mk-hero-content">
        <p className="mk-pretitle">A WORLD JUST OUT OF SIGHT <span className="mk-pretitle-line"/> VR / IN DEVELOPMENT</p>
        <h1 id="mk-hero-title" className="mk-wordmark">MOKRA<span className="mk-word-underline"/></h1>
        <p className="mk-hero-caption">GO DEEPER. MEET YOUR MONKI. DON&apos;T LOOK BACK.</p>
        <div className="mk-hero-cta"><Link className="mk-blue-button" href="/account">Make your account <ArrowUpRight size={16}/></Link><a className="mk-text-button" href="#movement">Discover the world <ArrowDown size={13}/></a></div>
        <p className="mk-hero-status"><span/> MULTIPLAYER VR — CURRENTLY IN DEVELOPMENT</p>
      </div>
      <div className="mk-hero-bottom"><span>001 / A WORLD WITH NO MAP</span><span><MousePointer2 size={14}/> MOVE YOUR MOUSE — IT&apos;S WATCHING</span><a href="#movement" aria-label="Scroll down"><ArrowDown size={19}/></a></div>
    </section>

    <section className="mk-movement" id="movement">
      <div className="mk-content mk-movement-grid">
        <Reveal className="mk-movement-text"><Kicker>01 / MOVEMENT IS EVERYTHING</Kicker><h2>Your arms<br/>are the way<br/><em>forward.</em></h2><p>Forget the joystick. Push off the ground, reach for a ledge, and fling yourself into places you probably shouldn&apos;t be. In Mokra, every move starts with you.</p><div className="mk-tiny-links"><span>ARM-DRIVEN MOVEMENT</span><span>CLIMB &amp; EXPLORE</span><span>BUILT FOR VR</span></div></Reveal>
        <div className="mk-movement-model"><Character color={selectedColor} variant="portrait"/><span className="mk-model-tag">MONKI 1 / ORIGINAL UPLOADED 3D MESH</span></div>
      </div>
    </section>

    <section className="mk-base" id="base">
      <div className="mk-base-image" aria-hidden="true"/>
      <div className="mk-base-shade"/>
      <Reveal className="mk-base-content"><Kicker>02 / SOMEWHERE BELOW</Kicker><h2>The dark<br/><em>remembers.</em></h2><p>Cold corridors. Distant signals. Doors that shouldn&apos;t open. There&apos;s more beneath the surface than anyone expected.</p><a className="mk-link-underline" href="#threats">MEET WHAT LIVES HERE <ArrowRight size={17}/></a></Reveal>
      <span className="mk-base-coord">ECHO STATION · FLOOR -04 · SIGNAL UNKNOWN</span>
    </section>

    <section className="mk-threats mk-section" id="threats">
      <div className="mk-content"><Reveal className="mk-section-head"><Kicker>03 / SOMETHING ELSE IS HERE</Kicker><h2>It knows<br/>you&apos;re here.</h2><p>The further you go, the harder it gets to pretend you&apos;re alone.</p></Reveal>
        <div className="mk-threat-stage"><div className="mk-threat-copy"><span className="mk-enemy-sub">{threat.label}</span><h3 key={threat.name}>{threat.name}</h3><p>{threat.text}</p><div className="mk-threat-controls"><div className="mk-progress-tabs" aria-label="Choose a creature">{threats.map((item,index)=><button key={item.name} aria-label={`View ${item.name}`} title={item.name} aria-pressed={selectedThreat===index} className={selectedThreat===index?'selected':''} onClick={()=>setSelectedThreat(index)}/>)}</div><div className="mk-arrow-buttons"><button aria-label="Previous creature" onClick={()=>setSelectedThreat((selectedThreat+threats.length-1)%threats.length)}><ChevronLeft size={17}/></button><button aria-label="Next creature" onClick={()=>setSelectedThreat((selectedThreat+1)%threats.length)}><ChevronRight size={17}/></button></div></div></div>
          <div className="mk-threat-visual" key={threat.image}><img src={threat.image} alt={`Illustration of ${threat.name}, a planned Mokra creature`}/><span className="mk-threat-count">{threat.number} / 03 — CONCEPT ENCOUNTER</span></div></div>
        </div>
    </section>

    <section className="mk-void" aria-hidden="true"><div className="mk-void-field"><div className="mk-void-ring"/><div className="mk-void-ring mk-void-ring-inner"/></div><span>THE SIGNAL IS CHANGING</span></section>

    <section className="mk-locations mk-section" id="locations"><div className="mk-content"><Reveal><Kicker>04 / YOUR WAY OUT ISN&apos;T MARKED</Kicker><h2>Three places.<br/>No easy exits.</h2><p>Different places. Different dangers. One rule: stick together.</p></Reveal><div className="mk-location-grid">{locations.map(item=><article className="mk-location-card" key={item.number}><div className="mk-location-image"><img src={item.src} alt={`${item.name}: original environmental concept art`}/><span>{item.number} / {item.tag}</span></div><div className="mk-location-details"><h3>{item.name}</h3><p>{item.desc}</p></div></article>)}</div><small className="mk-fine-print">ENVIRONMENTS AND ENCOUNTERS SHOWN ARE EARLY VISUAL CONCEPTS, NOT FINAL GAMEPLAY FOOTAGE.</small></div></section>

    <section className="mk-people mk-section" id="community"><div className="mk-content"><Reveal className="mk-people-intro"><Kicker>05 / BETTER WITH OTHERS</Kicker><h2>Bring people.</h2><p>It&apos;s scarier together. It&apos;s also a lot more fun.</p></Reveal><div className="mk-feature-grid">{features.map(({icon:Icon,title,desc})=><article key={title}><Icon size={24} strokeWidth={1.4}/><h3>{title}</h3><p>{desc}</p></article>)}</div></div></section>

    <section className="mk-customize mk-section" id="player"><div className="mk-content mk-customize-layout"><div className="mk-custom-model"><Character color={selectedColor} variant="mini"/></div><Reveal className="mk-custom-content"><Kicker>06 / IT&apos;S YOU IN THERE</Kicker><h2>Pick your<br/><em>color.</em></h2><p>Make your Mokra unmistakably yours. The creature on this page follows your cursor, and your profile can save its look.</p><div className="mk-colors" role="group" aria-label="Preview creature color">{palette.map(color=><button key={color} type="button" onClick={()=>setSelectedColor(color)} aria-label={`Choose color ${color}`} aria-pressed={color===selectedColor} className={color===selectedColor?'active':''} style={{'--mk-color':color}}/>)}</div><Link className="mk-blue-button" href="/account">Open player account <ArrowUpRight size={16}/></Link><small>Save your selected color in the account portal after signing in.</small></Reveal></div></section>

    <section className="mk-faq mk-section"><div className="mk-content mk-faq-layout"><Reveal><Kicker>07 / THE BASICS</Kicker><h2>Before you<br/>head down.</h2></Reveal><div className="mk-faq-list">{faqs.map(([q,a],i)=><div className="mk-faq-item" key={q}><button onClick={()=>setOpenFaq(openFaq===i?-1:i)} aria-expanded={openFaq===i}><span>{String(i+1).padStart(2,'0')}</span>{q}<ChevronDown size={17} className={openFaq===i?'open':''}/></button>{openFaq===i&&<p>{a}</p>}</div>)}</div></div></section>

    <section className="mk-end"><div className="mk-end-aura"/><div className="mk-content"><Reveal><Kicker>08 / UNTIL NEXT TIME</Kicker><h2>See you<br/><em>down there.</em></h2><p>Mokra is only getting started. Make a profile now and be ready when the doors open.</p><Link className="mk-blue-button" href="/account">Go to your profile <ArrowUpRight size={16}/></Link><div className="mk-end-down"><ArrowDown size={15}/> SCROLL TO LEARN MORE</div></Reveal></div></section>

    <footer className="mk-footer"><div className="mk-content mk-footer-columns"><div><span className="mk-footer-logo">MOKRA<span>✳</span></span><p>A multiplayer VR adventure in development.<br/>Original art, creatures and ideas.</p></div><div><strong>EXPLORE</strong><a href="#movement">Movement</a><a href="#base">The base</a><a href="#threats">Creatures</a><a href="#locations">Locations</a></div><div><strong>ACCOUNT</strong><Link href="/account">Player portal</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div><div><strong>STATUS</strong><span>In development</span><span>Original concept</span><span>More to come</span></div></div><div className="mk-content mk-footer-bottom"><span>© {new Date().getFullYear()} MOKRA. ALL RIGHTS RESERVED.</span><span>UNOFFICIAL INDIE VR PROJECT · NOT AFFILIATED WITH GILLA</span><a href="#top">BACK TO TOP ↑</a></div></footer>
  </main>;
}
