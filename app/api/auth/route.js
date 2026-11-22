import { query, json, hashPassword, verifyPassword, setSession, clearSession, rateLimit, publicUser } from '@/lib/server';
export const runtime='nodejs';
export async function POST(request){
  try{
    if(!(await rateLimit('auth',8)))return json({error:'Too many attempts. Try again shortly.'},429);
    const body=await request.json();const action=String(body.action||'');
    const username=String(body.username||'').toLowerCase().trim(),password=String(body.password||'');
    if(!/^[a-z0-9_]{3,20}$/.test(username)||password.length<10||password.length>128)return json({error:'Use a 3–20 character username and a password of at least 10 characters.'},400);
    if(action==='register'){
      const displayName=String(body.displayName||username).trim();
      if(displayName.length<1||displayName.length>32)return json({error:'Display name must be 1–32 characters.'},400);
      const exists=await query('SELECT 1 FROM mokra_accounts WHERE lower(username)=$1 LIMIT 1',[username]);
      if(exists.length)return json({error:'Username is taken.'},409);
      let rows;
      try{rows=await query('INSERT INTO mokra_accounts(username,display_name,password_hash) VALUES($1,$2,$3) RETURNING id,username,display_name,fur_color,level,total_runs,shards,created_at',[username,displayName,hashPassword(password)])}
      catch(e){if(e.code==='23505')return json({error:'Username is taken.'},409);throw e}
      await setSession(rows[0].id);return json({user:publicUser(rows[0])},201);
    }
    if(action==='login'){
      const rows=await query('SELECT * FROM mokra_accounts WHERE lower(username)=$1 LIMIT 1',[username]);
      if(!rows.length||!verifyPassword(password,rows[0].password_hash))return json({error:'Incorrect username or password.'},401);
      await setSession(rows[0].id);return json({user:publicUser(rows[0])});
    }
    return json({error:'Unknown action.'},400);
  }catch(e){console.error('auth service:',e.message);return json({error:'Account service unavailable. Check server configuration.'},503)}
}
export async function DELETE(){await clearSession();return json({ok:true})}
