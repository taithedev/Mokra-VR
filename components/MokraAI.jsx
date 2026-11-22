'use client';
import dynamic from 'next/dynamic';
import {useEffect,useRef,useState,useCallback} from 'react';
import {AudioLines,Bot,Check,ChevronDown,MessageCircle,Mic,RotateCcw,Send,Volume2,VolumeX,X} from 'lucide-react';

const Character=dynamic(()=>import('@/components/Character'),{ssr:false,loading:()=> <div className="mkai-avatar-loading">M</div>});
const welcome={id:'welcome',role:'assistant',content:"Hey, I'm Mokra AI! Ask about the game, player accounts, linking your headset, or anything you're curious about."};
const starters=['What is Mokra?','How do I link my VR account?','Can I customize my Monki?'];
const cleanSpeech=text=>text.replace(/https?:\/\/\S+/g,'').replace(/[*#_`]/g,'').slice(0,1700);
function offlineHelp(question){
 const q=question.toLowerCase();
 if(/hello|hey|hi\b|who are you/.test(q))return 'Hey! I am Mokra AI, the VR game website guide. I can explain the game and its account system. Live AI answers will work once the site owner connects the server key.';
 if(/link|sync|connect|headset|code|quest/.test(q))return 'In Mokra VR, choose Link Account to get an eight-character code. Sign in at the Mokra website /account page and enter it there. Codes expire after ten minutes. The Unity game must include the Mokra linking script for this to work.';
 if(/color|colour|rainbow|cosmetic|player model|monki|avatar|fur/.test(q))return 'The website uses the real Monki 3D model. Choose a color or rainbow effect in your player portal, then save it to Neon. Your VR game can fetch the saved appearance after linking.';
 if(/account|register|login|password|profile|sign in|signup/.test(q))return 'The player portal is at /account. You can register with a username and password, customize your character, manage your browser sessions, and link your game. Never share your password or linking code.';
 if(/release|when|play|download|available|launch/.test(q))return 'Mokra is in development. A public release date and game download have not been announced yet.';
 if(/map|world|monster|mode|explor|level/.test(q))return 'Mokra is an arm-driven VR game concept with exploration and spooky environments. The Station, Underpass, and Lower Level are preview concepts, not guaranteed finished maps.';
 return null;
}

export default function MokraAI(){
 const [open,setOpen]=useState(false);
 const [messages,setMessages]=useState([welcome]);
 const [draft,setDraft]=useState('');
 const [busy,setBusy]=useState(false);
 const [voice,setVoice]=useState(true);
 const [speaking,setSpeaking]=useState(false);
 const [listening,setListening]=useState(false);
 const [notice,setNotice]=useState('');
 const [connected,setConnected]=useState(null);
 const [loadingStatus,setLoadingStatus]=useState(false);
 const scrollRef=useRef(null);
 const inputRef=useRef(null);
 const speechRef=useRef(null);
 const recognitionRef=useRef(null);
 const requestRef=useRef(null);
 const sequence=useRef(0);

 const stopVoice=useCallback(()=>{
  if(typeof window!=='undefined'&&'speechSynthesis' in window)window.speechSynthesis.cancel();
  speechRef.current=null;
  setSpeaking(false);
 },[]);
 const speak=useCallback((text)=>{
  if(typeof window==='undefined'||!('speechSynthesis' in window)){
    setNotice('Your browser cannot play spoken replies. Text chat still works.');
    return;
  }
  stopVoice();
  const utterance=new SpeechSynthesisUtterance(cleanSpeech(text));
  utterance.lang='en-US';
  utterance.rate=.98;utterance.pitch=1.07;utterance.volume=.9;
  const choices=window.speechSynthesis.getVoices();
  const preferred=choices.find(v=>/^en[-_]/i.test(v.lang)&&/natural|enhanced|google|samantha|aria/i.test(v.name))
    ||choices.find(v=>/^en[-_]/i.test(v.lang));
  if(preferred)utterance.voice=preferred;
  speechRef.current=utterance;
  utterance.onstart=()=>{if(speechRef.current===utterance)setSpeaking(true)};
  utterance.onend=utterance.onerror=()=>{if(speechRef.current===utterance){setSpeaking(false);speechRef.current=null}};
  window.speechSynthesis.speak(utterance);
 },[stopVoice]);

 useEffect(()=>{
  const handler=()=>setOpen(true);
  window.addEventListener('mokra:open-ai',handler);
  return ()=>window.removeEventListener('mokra:open-ai',handler);
 },[]);
 useEffect(()=>{
  if(!open){stopVoice();recognitionRef.current?.stop?.();setListening(false);requestRef.current?.abort?.();return;}
  setLoadingStatus(true);
  fetch('/api/mokra-ai',{cache:'no-store'}).then(r=>r.json()).then(d=>setConnected(Boolean(d.ready))).catch(()=>setConnected(false)).finally(()=>setLoadingStatus(false));
  const focus=window.setTimeout(()=>inputRef.current?.focus(),160);
  return ()=>window.clearTimeout(focus);
 },[open,stopVoice]);
 useEffect(()=>{scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:'smooth'});},[messages,busy,open]);
 useEffect(()=>()=>{if(typeof window!=='undefined'&&'speechSynthesis' in window)window.speechSynthesis.cancel();requestRef.current?.abort?.();recognitionRef.current?.stop?.();},[]);
 
 async function ask(text){
  const question=String(text||draft).trim().slice(0,900);
  if(!question||busy)return;
  stopVoice();setNotice('');setDraft('');setBusy(true);
  const human={id:'u'+(++sequence.current),role:'user',content:question};
  const history=[...messages.filter(m=>m.id!=='welcome').slice(-8),human].slice(-10).map(m=>({role:m.role,content:m.content}));
  setMessages(old=>[...old,human]);
  const ctrl=new AbortController();
  requestRef.current=ctrl;
  let answer='',source='ai';
  try {
   const response=await fetch('/api/mokra-ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history}),signal:ctrl.signal});
   const payload=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(payload.error||'Mokra AI is unavailable.');
   answer=String(payload.reply||'').trim();
   if(!answer)throw new Error('Mokra AI did not return a reply.');
   setConnected(true);
  }catch(error){
   if(ctrl.signal.aborted)return;
   const help=offlineHelp(question);
   if(help){answer=help;source='faq';setNotice('Using the offline Mokra guide. Live AI requires the server connection.');}
   else {answer='I cannot connect to the live AI service right now. Try a game or account question, or ask again after the site is connected.';source='offline';setNotice(error.message||'Could not reach the AI service.');}
  }finally{
   if(requestRef.current===ctrl)requestRef.current=null;
   if(!ctrl.signal.aborted)setBusy(false);
  }
  if(ctrl.signal.aborted)return;
  setMessages(old=>[...old,{id:'a'+(++sequence.current),role:'assistant',content:answer,source}]);
  if(voice&&source!=='offline')speak(answer);
 }
 function toggleVoice(){
  if(voice)stopVoice();
  setVoice(v=>!v);
 }
 function clearChat(){
  stopVoice();requestRef.current?.abort?.();setBusy(false);setNotice('');setMessages([welcome]);
 }
 function toggleMic(){
  if(listening){recognitionRef.current?.stop?.();setListening(false);return;}
  if(typeof window==='undefined')return;
  const Engine=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Engine){setNotice('Voice typing is not supported by this browser. You can still type your question.');return;}
  try{
   const recognition=new Engine();
   recognition.lang='en-US';recognition.interimResults=false;recognition.continuous=false;
   recognition.onresult=e=>{const text=e.results?.[0]?.[0]?.transcript||'';setDraft(text.slice(0,900));};
   recognition.onend=()=>setListening(false);
   recognition.onerror=()=>{setListening(false);setNotice('Microphone input stopped. You can type your question instead.');};
   recognitionRef.current=recognition;recognition.start();setListening(true);setNotice('');
  }catch{setNotice('Could not start the microphone. Check your browser permissions.');}
 }
 return <div className={'mkai-shell'+(open?' mkai-shell--open':'')} id="mokra-ai">
  {!open&&<button type="button" className="mkai-launcher" onClick={()=>setOpen(true)} aria-label="Open Mokra AI assistant">
    <span className="mkai-launcher-spark">✳</span><span>Ask Mokra AI</span><MessageCircle size={19}/></button>}
  {open&&<section className="mkai-panel" aria-label="Mokra AI assistant">
   <header className="mkai-top">
    <div className="mkai-top-icon"><Bot size={20}/></div>
    <div className="mkai-top-text"><strong>Mokra AI</strong><small><i className={connected?'mkai-connected':''}/>{loadingStatus?'Checking connection':connected?'AI connected':'Game guide available'}</small></div>
    <button type="button" title="Clear chat" aria-label="Clear chat" onClick={clearChat}><RotateCcw size={17}/></button>
    <button type="button" title={voice?'Mute spoken replies':'Enable spoken replies'} aria-label={voice?'Mute spoken replies':'Enable spoken replies'} aria-pressed={voice} onClick={toggleVoice}>{voice?<Volume2 size={19}/>:<VolumeX size={19}/>}</button>
    <button type="button" title="Close Mokra AI" aria-label="Close Mokra AI" onClick={()=>setOpen(false)}><X size={20}/></button>
   </header>
   <div className="mkai-character">
     <div className="mkai-character-stage">
       <Character color="#9c91ff" variant="assistant" rainbow density={1} speaking={speaking}/>
     </div>
     <div className="mkai-character-info">
       <span className={'mkai-voice-indicator'+(speaking?' speaking':'')}>
         <AudioLines size={14}/>{speaking?'Speaking now':busy?'Thinking...':'Your VR guide'}
       </span>
       <p>A real Monki character answers your questions with voice and animated mouth movement.</p>
     </div>
   </div>
   <div className="mkai-messages" ref={scrollRef} role="log" aria-live="polite" aria-label="Chat messages">
    {messages.map(msg=><div key={msg.id} className={'mkai-message '+(msg.role==='user'?'mkai-message--user':'mkai-message--assistant')}>
      {msg.role==='assistant'&&<span className="mkai-message-avatar">✳</span>}
      <div className="mkai-message-bubble">{msg.content}{msg.source==='faq'&&<small className="mkai-source">Offline game guide</small>}</div>
    </div>)}
    {busy&&<div className="mkai-message mkai-message--assistant"><span className="mkai-message-avatar">✳</span><div className="mkai-typing"><i/><i/><i/></div></div>}
   </div>
   {messages.length<3&&<div className="mkai-suggestions">{starters.map(x=><button type="button" key={x} disabled={busy} onClick={()=>ask(x)}>{x}</button>)}</div>}
   {notice&&<div className="mkai-notice" role="status">{notice}</div>}
   <form className="mkai-compose" onSubmit={e=>{e.preventDefault();ask(draft)}}>
     <button type="button" className={listening?'mkai-mic active':'mkai-mic'} aria-label={listening?'Stop microphone input':'Voice type a question'} title="Voice type" onClick={toggleMic}><Mic size={18}/></button>
     <input ref={inputRef} value={draft} onChange={e=>setDraft(e.target.value)} maxLength={900} placeholder="Ask Mokra anything..." aria-label="Ask Mokra AI a question"/>
     <button type="submit" className="mkai-send" disabled={busy||!draft.trim()} aria-label="Send question"><Send size={18}/></button>
   </form>
   <div className="mkai-foot"><span>AI can make mistakes · Never share passwords</span><button type="button" onClick={()=>{stopVoice();setOpen(false)}}><ChevronDown size={14}/> Hide</button></div>
  </section>}
 </div>;
}
