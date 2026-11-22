import {query,json,hashPassword,verifyPassword,setSession,endSession,rateLimit,publicUser,verifyOrigin} from '@/lib/server';
import {validUsername,validPassword,displayNameValid} from '@/lib/validators.mjs';
export const runtime='nodejs';

export async function POST(request) {
 try {
  if(!verifyOrigin(request))return json({error:'Request origin not allowed.'},403);
  let body;try{body=await request.json();}catch{return json({error:'Invalid request body.'},400);}
  if(!body||typeof body!=='object')return json({error:'Invalid request.'},400);
  const action=body.action;
  if(action!=='login'&&action!=='register')return json({error:'Unknown account action.'},400);
  if(!(await rateLimit('auth-'+action,action==='register'?5:12)))return json({error:'Too many attempts. Try again in a minute.'},429);
  const username=String(body.username||'').toLowerCase().trim();
  const password=body.password;
  if(!validUsername(username)||!validPassword(password))return json({error:'Use a 3–20 character username (letters, digits, underscore) and a 10–128 character password.'},400);
  if(action==='register'){
    const displayName=String(body.displayName||username).trim();
    if(!displayNameValid(displayName))return json({error:'Display name must be 1–32 characters.'},400);
    let rows;
    try {
      rows=await query(`INSERT INTO mokra_accounts(username,display_name,password_hash,fur_color,particle_mode,particle_density)
      VALUES($1,$2,$3,$4,'rainbow',2)
      RETURNING id,username,display_name,fur_color,particle_mode,particle_density,level,total_runs,shards,created_at`,
       [username,displayName,hashPassword(password),'#476bff']);
    }catch(e){if(e.code==='23505')return json({error:'Username already taken.'},409);throw e;}
    await setSession(rows[0].id,request);
    return json({user:publicUser(rows[0])},201);
  }
  const rows=await query('SELECT * FROM mokra_accounts WHERE lower(username)=$1 LIMIT 1',[username]);
  if(!rows.length||!verifyPassword(password,rows[0].password_hash))return json({error:'Incorrect username or password.'},401);
  await setSession(rows[0].id,request);
  return json({user:publicUser(rows[0])});
 }catch(e){console.error('Mokra auth:',e.message);return json({error:'Account service unavailable. Check the Neon connection.'},503);}
}
export async function DELETE(request) {
 try{
  if(!verifyOrigin(request))return json({error:'Request origin not allowed.'},403);
  await endSession();return json({ok:true});
 }catch(e){console.error('Mokra logout:',e.message);return json({error:'Could not sign out. Try again.'},503);}
}
