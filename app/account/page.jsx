'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useEffect,useState} from 'react';
import {APPEARANCE_COLORS} from '@/lib/appearance';
import {ArrowLeft,ArrowUpRight,Link2,LogOut,ShieldCheck,Palette,Trash2,RefreshCw,CheckCircle2,Gamepad2,Eye,EyeOff} from 'lucide-react';
const Character=dynamic(()=>import('@/components/Character'),{ssr:false,loading:()=> <div className="model-loading">LOADING CHARACTER...</div>});
const colors=APPEARANCE_COLORS.map(x=>x.value);
async function api(path,method='GET',body){
 const response=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 let data;try{data=await response.json()}catch{data={error:'Unexpected server response.'}}
 if(!response.ok){const e=new Error(data.error||'Request failed.');e.status=response.status;throw e;}
 return data;
}
export default function Account(){
 const[user,setUser]=useState(null),[sessions,setSessions]=useState([]),[webSessions,setWebSessions]=useState([]),[loading,setLoading]=useState(true),[serviceError,setServiceError]=useState('');
 const[mode,setMode]=useState('register'),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[visible,setVisible]=useState(false);
 const[name,setName]=useState(''),[color,setColor]=useState(colors[0]),[code,setCode]=useState('');
 const[particleMode,setParticleMode]=useState('rainbow'),[particleDensity,setParticleDensity]=useState(2);
 const[passwordOpen,setPasswordOpen]=useState(false),[oldPassword,setOldPassword]=useState(''),[newPassword,setNewPassword]=useState('');
 const[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[deleteOpen,setDeleteOpen]=useState(false),[deletePassword,setDeletePassword]=useState('');
 async function load(){
  try{
    const d=await api('/api/me');
    setUser(d.user);setSessions(d.sessions||[]);setWebSessions(d.webSessions||[]);setName(d.user.displayName);setColor(d.user.furColor);
    setParticleMode(d.user.particleMode||'rainbow');setParticleDensity(d.user.particleDensity||2);setServiceError('');
  }catch(e){
    if(e.status===401){
      setUser(null);setSessions([]);setWebSessions([]);
      try{await api('/api/health');setServiceError('');}
      catch{setServiceError('Cannot connect to Neon. Check the DATABASE_URL environment variable and apply the migration.');}
    } else {setServiceError(e.message||'Account service unavailable.');}
  }finally{setLoading(false);}
 }
 useEffect(()=>{load()},[]);
 function notice(ok,txt){setMessage(ok?txt:'');setError(ok?'':txt)}
 async function submitAuth(e){
  e.preventDefault();setBusy(true);notice(true,'');
  try{const d=await api('/api/auth','POST',{action:mode,username,password,displayName:name||username});
   setUser(d.user);setName(d.user.displayName);setColor(d.user.furColor);setParticleMode(d.user.particleMode||'rainbow');setParticleDensity(d.user.particleDensity||2);setSessions([]);setWebSessions([]);setPassword('');setServiceError('');notice(true,'Your account is ready and saved to Neon.')}
  catch(e){notice(false,e.message)}finally{setBusy(false)}
 }
 async function saveProfile(e){
  e.preventDefault();setBusy(true);notice(true,'');
  try{const d=await api('/api/me','PATCH',{displayName:name,furColor:color,particleMode,particleDensity});setUser(d.user);notice(true,'Appearance saved to Neon. Refresh your in-game profile to sync.')}
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
  try{await api('/api/auth','DELETE');setUser(null);setSessions([]);setWebSessions([]);setPassword('');notice(true,'Signed out.')}
  catch(e){notice(false,e.message)}finally{setBusy(false)}
 }
 async function revokeWebSession(sessionId){
  setBusy(true);notice(true,'');
  try{
    await api('/api/me','POST',{action:'revokeWebSession',sessionId});
    await load();notice(true,'Browser session revoked.');
  }catch(e){notice(false,e.message)}finally{setBusy(false)}
 }
 async function signOutOtherBrowsers(){
  setBusy(true);notice(true,'');
  try{
    const d=await api('/api/me','POST',{action:'revokeOtherWebSessions'});
    await load();notice(true,d.revoked===1?'Other browser signed out.':`${d.revoked} other browsers signed out.`);
  }catch(e){notice(false,e.message)}finally{setBusy(false)}
 }
 async function changePassword(e){
  e.preventDefault();setBusy(true);notice(true,'');
  try{
    const d=await api('/api/me','POST',{action:'changePassword',currentPassword:oldPassword,newPassword});
    setOldPassword('');setNewPassword('');setPasswordOpen(false);await load();notice(true,d.message||'Password updated.');
  }catch(e){notice(false,e.message);}finally{setBusy(false);}
 }
 async function deleteAccount(e){
  e.preventDefault();setBusy(true);
  try{await api('/api/me','DELETE',{password:deletePassword});setUser(null);setSessions([]);setWebSessions([]);setDeletePassword('');setDeleteOpen(false);notice(true,'Your account was deleted.')}
  catch(e){notice(false,e.message)}finally{setBusy(false)}
 }
 return <main className="portal-page">
 <header className="portal-nav wrap"><Link href="/" className="logo">M<span>/</span>KRA<span className="asterisk">✳</span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> BACK TO THE WORLD</Link></header>
 <div className="portal-hero wrap"><span className="overline">MOKRA / PLAYER SYSTEM</span><h1>YOUR<br/><em>IDENTITY.</em></h1><p>One player account. Your creature, settings, and VR connection.</p></div>
 <div className="wrap account-layout">
  <aside className="portal-aside"><div className="aside-tag">IDENTITY SYSTEM / 001</div><div className="aside-orbit"><span className="aside-m">M✳</span></div><div className="aside-feature"><ShieldCheck size={23}/><div><b>SECURE LINKING</b><p>Your VR game uses a temporary code. Your password stays on the website.</p></div></div><div className="aside-feature"><Palette size={23}/><div><b>PERSONALIZE YOURSELF</b><p>Save fur colors and display names to your Neon account.</p></div></div></aside>
  <section className="portal-panel">
   {serviceError&&<div className="mk-v6-service-error" role="alert"><ShieldCheck size={19}/><div><b>ACCOUNT CONNECTION ISSUE</b><p>{serviceError}</p><button type="button" onClick={()=>{setLoading(true);load()}}>Retry connection</button></div></div>}
   {loading?<div className="loading-box">CHECKING ACCOUNT SESSION...</div>:!user?
    <div className="auth-box"><span className="panel-label">01 / CREATE OR ACCESS</span><h2>{mode==='register'?'JOIN MOKRA.':'WELCOME BACK.'}</h2><p>Use a username and password. No email is needed for this development portal.</p>
    <div className="auth-switch"><button className={mode==='register'?'selected':''} type="button" onClick={()=>{setMode('register');notice(true,'')}}>CREATE ACCOUNT</button><button className={mode==='login'?'selected':''} type="button" onClick={()=>{setMode('login');notice(true,'')}}>SIGN IN</button></div>
    <form onSubmit={submitAuth} className="stack">
     <label>USERNAME <input required minLength={3} maxLength={20} autoComplete="username" placeholder="your_username" value={username} onChange={e=>setUsername(e.target.value)}/></label>
     {mode==='register'&&<label>DISPLAY NAME <input maxLength={32} placeholder="Your name in Mokra" value={name} onChange={e=>setName(e.target.value)}/></label>}
     <label>PASSWORD <span className="password-field"><input required minLength={10} maxLength={128} autoComplete={mode==='register'?'new-password':'current-password'} type={visible?'text':'password'} placeholder="At least 10 characters" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" onClick={()=>setVisible(!visible)} aria-label={visible?'Hide password':'Show password'}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>
     <button className="primary full" disabled={busy||Boolean(serviceError)} type="submit">{busy?'WORKING...':mode==='register'?'CREATE MY ACCOUNT':'SIGN IN'} <ArrowUpRight size={18}/></button>
    </form><p className="panel-note">Keep your password private. Password recovery is not yet available.</p>
    </div>:
    <div className="dashboard"><div className="dashboard-top"><div><span className="panel-label">WELCOME TO YOUR ACCOUNT</span><h2>HEY, {user.username.toUpperCase()}.</h2><p>Your identity is ready for Mokra.</p></div><button className="outline-button" disabled={busy} onClick={logout}><LogOut size={16}/> SIGN OUT</button></div>
    <div className="mk-v7-account-summary"><span>● Neon profile</span><span>Rainbow avatar ready</span><span>VR game linking</span></div>
    <div className="stat-grid"><div><span>PLAYER LEVEL</span><b>{user.level}</b></div><div><span>TOTAL RUNS</span><b>{user.totalRuns}</b></div><div><span>SHARDS</span><b>{user.shards}</b></div></div>
    <div className="profile-grid"><div className="small-model"><Character color={color} variant="mini" rainbow={particleMode==='rainbow'} density={particleDensity}/><span>REAL 3D PLAYER MODEL</span></div><form className="stack" onSubmit={saveProfile}><span className="panel-label">02 / PROFILE</span><h3>MAKE IT YOURS.</h3><label>DISPLAY NAME <input required minLength={1} maxLength={32} value={name} onChange={e=>setName(e.target.value)}/></label><div className="color-title">FUR COLOR <span>{color.toUpperCase()}</span></div><div className="color-grid">{APPEARANCE_COLORS.map(item=><button key={item.value} type="button" aria-pressed={item.value===color} aria-label={'Choose '+item.name} title={item.name} className={'color-button '+(item.value===color?'chosen':'')} style={{background:item.value}} onClick={()=>setColor(item.value)}/>)}</div>
    <label className="mk-v6-custom-label">CUSTOM FUR COLOR <input aria-label="Choose a custom fur color" type="color" value={color} onChange={e=>setColor(e.target.value)}/></label>
    <div className="mk-v6-account-controls"><span>PARTICLE EFFECT</span><div className="mk-v6-mode-row"><button type="button" aria-pressed={particleMode==='rainbow'} className={particleMode==='rainbow'?'chosen':''} onClick={()=>setParticleMode('rainbow')}>Rainbow</button><button type="button" aria-pressed={particleMode==='solid'} className={particleMode==='solid'?'chosen':''} onClick={()=>setParticleMode('solid')}>Solid</button></div><label>DOT DENSITY · {particleDensity}<input type="range" min="1" max="4" value={particleDensity} onChange={e=>setParticleDensity(Number(e.target.value))}/></label></div>
    <button className="primary full" disabled={busy} type="submit">SAVE CHANGES <ArrowUpRight size={16}/></button></form></div>
    <div className="dashboard-section"><span className="panel-label">03 / CONNECT YOUR GAME</span><h3>LINK YOUR HEADSET.</h3><p>Inside Mokra VR, choose Link Account to get an eight-character code. Enter that code below while signed in.</p><form className="link-form" onSubmit={linkGame}><label className="sr-only" htmlFor="pair-code">VR linking code</label><input id="pair-code" required maxLength={12} autoComplete="off" spellCheck={false} placeholder="8-CHARACTER CODE" value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/><button type="submit" disabled={busy} className="primary">LINK DEVICE <Link2 size={17}/></button></form><p className="hint">Codes expire after 10 minutes. Never share your code with strangers.</p></div>
    <div className="dashboard-section"><div className="section-title"><div><span className="panel-label">04 / CONNECTED DEVICES</span><h3>ACTIVE SESSIONS.</h3></div><button className="outline-button" type="button" onClick={load}><RefreshCw size={15}/> REFRESH</button></div>{sessions.length===0?<p>No connected VR devices yet. They appear here after the game finishes linking.</p>:<div className="sessions">{sessions.map(s=><div key={s.id} className="session"><div><Gamepad2 size={19}/><span><b>{s.device_name}</b><small>Linked {new Date(s.created_at).toLocaleDateString()}</small></span></div><button type="button" disabled={busy} onClick={()=>revoke(s.id)}>REVOKE</button></div>)}</div>}</div>
    <div className="dashboard-section mk-v6-security"><span className="panel-label">05 / SECURITY</span><h3>ACCOUNT SECURITY.</h3><p>Manage signed-in browsers or change your password to sign out all other website sessions.</p>{!passwordOpen?<button type="button" className="outline-button" onClick={()=>setPasswordOpen(true)}>CHANGE PASSWORD</button>:<form onSubmit={changePassword} className="stack"><label>CURRENT PASSWORD<input required type="password" autoComplete="current-password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)}/></label><label>NEW PASSWORD<input required type="password" minLength={10} maxLength={128} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><div className="inline-actions"><button disabled={busy} className="primary" type="submit">UPDATE PASSWORD</button><button type="button" className="outline-button" onClick={()=>{setPasswordOpen(false);setOldPassword('');setNewPassword('')}}>CANCEL</button></div></form>}
      <div className="mk-v7-web-sessions">
        <header><h4>Signed-in browsers</h4><button type="button" disabled={busy||webSessions.length<=1} onClick={signOutOtherBrowsers}>Sign out other browsers</button></header>
        <p>Sessions are stored securely in Neon. You can revoke any session except the browser you are using right now.</p>
        {webSessions.length===0?<p>No active browser sessions found.</p>:
        <ul>{webSessions.map(session=><li key={session.id}><div>
          <b>{session.user_agent?.includes('Firefox')?'Firefox':session.user_agent?.includes('Edg/')?'Microsoft Edge':session.user_agent?.includes('Chrome')?'Chrome':session.user_agent?.includes('Safari')?'Safari':'Browser session'}</b>
          <small>Signed in {new Date(session.created_at).toLocaleDateString()}</small>
        </div>{session.is_current?<span className="current">This browser</span>:<button type="button" disabled={busy} onClick={()=>revokeWebSession(session.id)}>Revoke</button>}</li>)}</ul>}
      </div>
    </div>
    <div className="danger-zone"><span className="panel-label">06 / ACCOUNT CONTROL</span><h3>DELETE ACCOUNT.</h3><p>Deleting your account permanently removes your profile and all linked device sessions.</p>{!deleteOpen?<button type="button" className="danger-button" onClick={()=>setDeleteOpen(true)}><Trash2 size={16}/> DELETE ACCOUNT</button>:<form onSubmit={deleteAccount} className="stack"><label>CONFIRM WITH YOUR PASSWORD<input required type="password" autoComplete="current-password" value={deletePassword} onChange={e=>setDeletePassword(e.target.value)}/></label><div className="inline-actions"><button disabled={busy} className="danger-button" type="submit">PERMANENTLY DELETE</button><button type="button" className="outline-button" onClick={()=>setDeleteOpen(false)}>CANCEL</button></div></form>}</div>
    </div>
   }
   {message&&<div role="status" className="notice success"><CheckCircle2 size={18}/>{message}</div>}
   {error&&<div role="alert" className="notice error">{error}</div>}
  </section>
 </div><footer className="portal-footer wrap"><span>MOKRA / DEVELOPMENT ACCOUNT PORTAL</span><span><Link href="/privacy">PRIVACY</Link> · <Link href="/terms">TERMS</Link></span></footer></main>;
}
