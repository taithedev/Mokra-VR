import {query,json,currentUser,publicUser,rateLimit,verifyPassword,hashPassword,clearSession,setSession,verifyOrigin,currentSessionHash} from '@/lib/server';
import {validColor,validMode,validDensity,validPassword,displayNameValid} from '@/lib/validators.mjs';
export const runtime='nodejs';
export async function GET() {
 try{
  const user=await currentUser();
  if(!user)return json({error:'Not signed in.'},401);
  const sessions=await query('SELECT id,device_name,created_at,expires_at FROM mokra_game_sessions WHERE account_id=$1::uuid AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 30',[user.id]);
  const activeHash=await currentSessionHash();
  const webSessions=await query(`SELECT id,user_agent,created_at,expires_at,(token_hash=$2) AS is_current
    FROM mokra_web_sessions WHERE account_id=$1::uuid AND expires_at>now()
    ORDER BY created_at DESC LIMIT 25`,[user.id,activeHash]);
  return json({user:publicUser(user),sessions,webSessions});
 }catch(e){console.error('Mokra me GET:',e.message);return json({error:'Account service unavailable. Check the Neon connection.'},503);}
}
export async function PATCH(req) {
 try{
  if(!verifyOrigin(req))return json({error:'Request origin not allowed.'},403);
  const user=await currentUser();if(!user)return json({error:'Not signed in.'},401);
  if(!(await rateLimit('profile',25)))return json({error:'Slow down and try again.'},429);
  let b;try{b=await req.json();}catch{return json({error:'Invalid profile data.'},400);}
  const name=String(b.displayName??user.display_name).trim();
  const color=String(b.furColor??user.fur_color).toLowerCase();
  const mode=String(b.particleMode??user.particle_mode??'rainbow');
  const density=Number(b.particleDensity??user.particle_density??2);
  if(!displayNameValid(name)||!validColor(color)||!validMode(mode)||!validDensity(density))return json({error:'Invalid name, color, or particle settings.'},400);
  const rows=await query(`UPDATE mokra_accounts SET display_name=$1,fur_color=$2,particle_mode=$3,particle_density=$4,updated_at=now()
    WHERE id=$5::uuid RETURNING id,username,display_name,fur_color,particle_mode,particle_density,level,total_runs,shards,created_at`,
    [name,color,mode,density,user.id]);
  return json({user:publicUser(rows[0])});
 }catch(e){console.error('Mokra me PATCH:',e.message);return json({error:'Could not save profile.'},503);}
}
export async function POST(req) {
 try {
  if(!verifyOrigin(req))return json({error:'Request origin not allowed.'},403);
  const user=await currentUser();if(!user)return json({error:'Not signed in.'},401);
  let b;try{b=await req.json();}catch{return json({error:'Invalid request.'},400);}
  const action=String(b.action||'');
  if(action==='revokeWebSession' || action==='revokeOtherWebSessions') {
    if(!(await rateLimit('manage-web-sessions',20,60)))return json({error:'Try again shortly.'},429);
    const currentHash=await currentSessionHash();
    if(!currentHash)return json({error:'Not signed in.'},401);
    if(action==='revokeWebSession'){
      const sessionId=String(b.sessionId||'');
      if(!/^[0-9a-f-]{36}$/i.test(sessionId))return json({error:'Invalid session ID.'},400);
      const sessions=await query(`DELETE FROM mokra_web_sessions WHERE id=$1::uuid AND account_id=$2::uuid
        AND token_hash<>$3 RETURNING id`,[sessionId,user.id,currentHash]);
      if(!sessions.length)return json({error:'Session not found or it is your current session.'},404);
      return json({ok:true,revoked:1});
    }
    const removed=await query(`DELETE FROM mokra_web_sessions WHERE account_id=$1::uuid AND token_hash<>$2 RETURNING id`,
      [user.id,currentHash]);
    return json({ok:true,revoked:removed.length});
  }
  if(action!=='changePassword')return json({error:'Unknown account action.'},400);
  if(!(await rateLimit('change-password',5,300)))return json({error:'Too many attempts. Try again later.'},429);
  if(!validPassword(b.newPassword))return json({error:'New password must contain 10–128 characters.'},400);
  if(b.newPassword===b.currentPassword)return json({error:'Choose a different password.'},400);
  const rows=await query('SELECT password_hash FROM mokra_accounts WHERE id=$1::uuid',[user.id]);
  if(!rows.length||!verifyPassword(String(b.currentPassword||''),rows[0].password_hash))return json({error:'Current password is incorrect.'},403);
  await query('UPDATE mokra_accounts SET password_hash=$1,updated_at=now() WHERE id=$2::uuid',[hashPassword(b.newPassword),user.id]);
  await query('DELETE FROM mokra_web_sessions WHERE account_id=$1::uuid',[user.id]);
  await setSession(user.id,req);
  return json({ok:true,message:'Password updated. Other website sessions signed out.'});
 }catch(e){console.error('Mokra me password:',e.message);return json({error:'Could not change password.'},503);}
}
export async function DELETE(req) {
 try {
  if(!verifyOrigin(req))return json({error:'Request origin not allowed.'},403);
  const user=await currentUser();if(!user)return json({error:'Not signed in.'},401);
  if(!(await rateLimit('delete-account',4,300)))return json({error:'Too many attempts.'},429);
  let b;try{b=await req.json();}catch{return json({error:'Invalid request.'},400);}
  const rows=await query('SELECT password_hash FROM mokra_accounts WHERE id=$1::uuid',[user.id]);
  if(!rows.length||!verifyPassword(String(b.password||''),rows[0].password_hash))return json({error:'Incorrect password.'},403);
  await query('DELETE FROM mokra_accounts WHERE id=$1::uuid',[user.id]);
  await clearSession();return json({ok:true});
 }catch(e){console.error('Mokra me DELETE:',e.message);return json({error:'Could not delete account.'},503);}
}
