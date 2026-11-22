'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowUpRight,Link2,LogOut,ShieldCheck,Palette,Trash2,RefreshCw,CheckCircle2,Gamepad2,Eye,EyeOff} from 'lucide-react';
const Character=dynamic(()=>import('@/components/Character'),{ssr:false,loading:()=> <div className="model-loading">LOADING CHARACTER...</div>});
const colors=['#d1ef7c','#67c6d0','#c09ef6','#f9a76c','#ff8198','#efefdf','#80baf2','#a6ca8f'];
async function api(path,method='GET',body){
 const response=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 let data;try{data=await response.json()}catch{data={error:'Unexpected server response.'}}
 if(!response.ok)throw Error(data.error||'Request failed.');
 return data;
}
export default function Account(){
 const[user,setUser]=useState(null),[sessions,setSessions]=useState([]),[loading,setLoading]=useState(true);
 const[mode,setMode]=useState('register'),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[visible,setVisible]=useState(false);
 const[name,setName]=useState(''),[color,setColor]=useState(colors[0]),[code,setCode]=useState('');
 const[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[deleteOpen,setDeleteOpen]=useState(false),[deletePassword,setDeletePassword]=useState('');
 async function load(){
  try{const d=await api('/api/me');setUser(d.user);setSessions(d.sessions||[]);setName(d.user.displayName);setColor(d.user.furColor)}
  catch{setUser(null);setSessions([])}
  finally{setLoading(false)}
 }
 useEffect(()=>{load()},[]);
 function notice(ok,txt){setMessage(ok?txt:'');setError(ok?'':txt)}
 async function submitAuth(e){
  e.preventDefault();setBusy(true);notice(true,'');
  try{const d=await api('/api/auth','POST',{action:mode,username,password,displayName:name||username});
   setUser(d.user);setName(d.user.displayName);setColor(d.user.furColor);setSessions([]);setPassword('');notice(true,'Account ready. Your profile is stored securely.')}
  catch(e){notice(false,e.message)}finally{setBusy(false)}
 }
 async function saveProfile(e){
  e.preventDefault();setBusy(true);notice(true,'');
  try{const d=await api('/api/me','PATCH',{displayName:name,furColor:color});setUser(d.user);notice(true,'Profile saved. Refresh in VR to see your new fur color.')}
  catch(e){notice(false,e.message)}finally{setBusy(false)}
 }
 async function linkGame(e){
  e.preventDefault();setBusy(true);notice(true,'');
  try{const d=await api('/api/game','POST',{action:'approve',code});setCode('');notice(true,'Approved '+d.deviceName+'. Return to your headset to finish linking.')}
  catch(e){notice(false,e.message)}finally{setBusy(false)}
 }
 async function revoke(id){
  setBusy(true);try{await api('/api/game','POST',{action:'revoke',sessionId:id});await load();notice(true,'Device session revoked.')}
  catch(e){notice(false,e.message)}finally{setBusy(false)}
 }
 async function logout(){
  setBusy(true);
  try{await api('/api/auth','DELETE');setUser(null);setSessions([]);setPassword('');notice(true,'Signed out.')}
  catch(e){notice(false,e.message)}finally{setBusy(false)}
 }
 async function deleteAccount(e){
  e.preventDefault();setBusy(true);
  try{await api('/api/me','DELETE',{password:deletePassword});setUser(null);setSessions([]);setDeletePassword('');setDeleteOpen(false);notice(true,'Your account was deleted.')}
  catch(e){notice(false,e.message)}finally{setBusy(false)}
 }
 return <main className="portal-page">
 <header className="portal-nav wrap"><Link href="/" className="logo">M<span>/</span>KRA<span className="asterisk">✳</span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> BACK TO THE WORLD</Link></header>
 <div className="portal-hero wrap"><span className="overline">MOKRA / PLAYER SYSTEM</span><h1>YOUR<br/><em>IDENTITY.</em></h1><p>One player account. Your creature, settings, and VR connection.</p></div>
 <div className="wrap account-layout">
  <aside className="portal-aside"><div className="aside-tag">IDENTITY SYSTEM / 001</div><div className="aside-orbit"><span className="aside-m">M✳</span></div><div className="aside-feature"><ShieldCheck size={23}/><div><b>SECURE LINKING</b><p>Your VR game uses a temporary code. Your password stays on the website.</p></div></div><div className="aside-feature"><Palette size={23}/><div><b>PERSONALIZE YOURSELF</b><p>Save fur colors and display names to your Neon account.</p></div></div></aside>
  <section className="portal-panel">
   {loading?<div className="loading-box">CHECKING ACCOUNT SESSION...</div>:!user?
    <div className="auth-box"><span className="panel-label">01 / CREATE OR ACCESS</span><h2>{mode==='register'?'JOIN MOKRA.':'WELCOME BACK.'}</h2><p>Use a username and password. No email is needed for this development portal.</p>
    <div className="auth-switch"><button className={mode==='register'?'selected':''} type="button" onClick={()=>{setMode('register');notice(true,'')}}>CREATE ACCOUNT</button><button className={mode==='login'?'selected':''} type="button" onClick={()=>{setMode('login');notice(true,'')}}>SIGN IN</button></div>
    <form onSubmit={submitAuth} className="stack">
     <label>USERNAME <input required minLength={3} maxLength={20} autoComplete="username" placeholder="your_username" value={username} onChange={e=>setUsername(e.target.value)}/></label>
     {mode==='register'&&<label>DISPLAY NAME <input maxLength={32} placeholder="Your name in Mokra" value={name} onChange={e=>setName(e.target.value)}/></label>}
     <label>PASSWORD <span className="password-field"><input required minLength={10} maxLength={128} autoComplete={mode==='register'?'new-password':'current-password'} type={visible?'text':'password'} placeholder="At least 10 characters" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" onClick={()=>setVisible(!visible)} aria-label={visible?'Hide password':'Show password'}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>
     <button className="primary full" disabled={busy} type="submit">{busy?'WORKING...':mode==='register'?'CREATE MY ACCOUNT':'SIGN IN'} <ArrowUpRight size={18}/></button>
    </form><p className="panel-note">Keep your password private. Password recovery is not yet available.</p>
    </div>:
    <div className="dashboard"><div className="dashboard-top"><div><span className="panel-label">WELCOME TO YOUR ACCOUNT</span><h2>HEY, {user.username.toUpperCase()}.</h2><p>Your identity is ready for Mokra.</p></div><button className="outline-button" disabled={busy} onClick={logout}><LogOut size={16}/> SIGN OUT</button></div>
    <div className="stat-grid"><div><span>PLAYER LEVEL</span><b>{user.level}</b></div><div><span>TOTAL RUNS</span><b>{user.totalRuns}</b></div><div><span>SHARDS</span><b>{user.shards}</b></div></div>
    <div className="profile-grid"><div className="small-model"><Character color={color}/><span>LIVE CHARACTER PREVIEW</span></div><form className="stack" onSubmit={saveProfile}><span className="panel-label">02 / PROFILE</span><h3>MAKE IT YOURS.</h3><label>DISPLAY NAME <input required minLength={1} maxLength={32} value={name} onChange={e=>setName(e.target.value)}/></label><div className="color-title">FUR COLOR <span>{color.toUpperCase()}</span></div><div className="color-grid">{colors.map(c=><button key={c} type="button" aria-pressed={c===color} aria-label={'Choose color '+c} className={'color-button '+(color===c?'chosen':'')} style={{background:c}} onClick={()=>setColor(c)}/>)}</div><button className="primary full" disabled={busy} type="submit">SAVE CHANGES <ArrowUpRight size={16}/></button></form></div>
    <div className="dashboard-section"><span className="panel-label">03 / CONNECT YOUR GAME</span><h3>LINK YOUR HEADSET.</h3><p>Inside Mokra VR, choose Link Account to get an eight-character code. Enter that code below while signed in.</p><form className="link-form" onSubmit={linkGame}><label className="sr-only" htmlFor="pair-code">VR linking code</label><input id="pair-code" required maxLength={12} autoComplete="off" spellCheck={false} placeholder="8-CHARACTER CODE" value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/><button type="submit" disabled={busy} className="primary">LINK DEVICE <Link2 size={17}/></button></form><p className="hint">Codes expire after 10 minutes. Never share your code with strangers.</p></div>
    <div className="dashboard-section"><div className="section-title"><div><span className="panel-label">04 / CONNECTED DEVICES</span><h3>ACTIVE SESSIONS.</h3></div><button className="outline-button" type="button" onClick={load}><RefreshCw size={15}/> REFRESH</button></div>{sessions.length===0?<p>No connected VR devices yet. They appear here after the game finishes linking.</p>:<div className="sessions">{sessions.map(s=><div key={s.id} className="session"><div><Gamepad2 size={19}/><span><b>{s.device_name}</b><small>Linked {new Date(s.created_at).toLocaleDateString()}</small></span></div><button type="button" disabled={busy} onClick={()=>revoke(s.id)}>REVOKE</button></div>)}</div>}</div>
    <div className="danger-zone"><span className="panel-label">05 / ACCOUNT CONTROL</span><h3>DELETE ACCOUNT.</h3><p>Deleting your account permanently removes your profile and all linked device sessions.</p>{!deleteOpen?<button type="button" className="danger-button" onClick={()=>setDeleteOpen(true)}><Trash2 size={16}/> DELETE ACCOUNT</button>:<form onSubmit={deleteAccount} className="stack"><label>CONFIRM WITH YOUR PASSWORD<input required type="password" autoComplete="current-password" value={deletePassword} onChange={e=>setDeletePassword(e.target.value)}/></label><div className="inline-actions"><button disabled={busy} className="danger-button" type="submit">PERMANENTLY DELETE</button><button type="button" className="outline-button" onClick={()=>setDeleteOpen(false)}>CANCEL</button></div></form>}</div>
    </div>
   }
   {message&&<div role="status" className="notice success"><CheckCircle2 size={18}/>{message}</div>}
   {error&&<div role="alert" className="notice error">{error}</div>}
  </section>
 </div><footer className="portal-footer wrap"><span>MOKRA / DEVELOPMENT ACCOUNT PORTAL</span><span><Link href="/privacy">PRIVACY</Link> · <Link href="/terms">TERMS</Link></span></footer></main>;
}
