import { query, json, currentUser, digest, randomToken, rateLimit, publicUser } from '@/lib/server';
import { randomInt } from 'node:crypto';
export const runtime='nodejs';
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function code(){return Array.from({length:8},()=>ALPHABET[randomInt(ALPHABET.length)]).join('')}
export async function POST(request){
 try{
  const b=await request.json(),action=String(b.action||'');
  if(action==='start'){
   if(!(await rateLimit('game-start',6)))return json({error:'Too many pairing attempts.'},429);
   const deviceName=String(b.deviceName||'VR headset').trim().slice(0,64)||'VR headset';
   const pairingCode=code(),pollToken=randomToken();
   await query('INSERT INTO mokra_pairings(code_hash,poll_hash,device_name) VALUES($1,$2,$3)',[digest(pairingCode),digest(pollToken),deviceName]);
   return json({code:pairingCode,pollToken,expiresIn:600,verificationUrl:'/account'});
  }
  if(action==='status'){
   if(!(await rateLimit('game-status',100)))return json({error:'Too many polls.'},429);
   const pollToken=String(b.pollToken||'');
   if(pollToken.length<32||pollToken.length>128)return json({error:'Invalid token.'},400);
   const rows=await query('SELECT id,account_id,expires_at,consumed_at FROM mokra_pairings WHERE poll_hash=$1 LIMIT 1',[digest(pollToken)]);
   const record=rows[0];
   if(!record||new Date(record.expires_at).getTime()<Date.now())return json({status:'expired'});
   if(!record.account_id)return json({status:'pending'});
   if(record.consumed_at)return json({status:'completed'});
   const claim=await query('UPDATE mokra_pairings SET consumed_at=now() WHERE id=$1::uuid AND consumed_at IS NULL AND account_id IS NOT NULL AND expires_at>now() RETURNING account_id,device_name',[record.id]);
   if(!claim.length)return json({status:'completed'});
   const token=randomToken();
   await query('INSERT INTO mokra_game_sessions(account_id,token_hash,device_name) VALUES($1::uuid,$2,$3)',[claim[0].account_id,digest(token),claim[0].device_name]);
   return json({status:'linked',accessToken:token,expiresIn:7776000});
  }
  if(action==='approve'){
   if(!(await rateLimit('game-approve',8)))return json({error:'Too many attempts.'},429);
   const user=await currentUser();if(!user)return json({error:'Sign in first.'},401);
   const pairingCode=String(b.code||'').toUpperCase().replace(/[\s-]/g,'');
   if(!/^[A-HJ-NP-Z2-9]{8}$/.test(pairingCode))return json({error:'Enter the eight-character game code.'},400);
   const rows=await query('UPDATE mokra_pairings SET account_id=$1::uuid WHERE code_hash=$2 AND account_id IS NULL AND expires_at>now() AND consumed_at IS NULL RETURNING device_name',[user.id,digest(pairingCode)]);
   if(!rows.length)return json({error:'Code expired or already used.'},404);
   return json({ok:true,deviceName:rows[0].device_name});
  }
  if(action==='profile'){
   if(!(await rateLimit('game-profile',100)))return json({error:'Too many requests.'},429);
   const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
   if(token.length<32||token.length>128)return json({error:'Unauthorized.'},401);
   const rows=await query('SELECT a.id,a.username,a.display_name,a.fur_color,a.level,a.total_runs,a.shards,a.created_at FROM mokra_game_sessions s JOIN mokra_accounts a ON s.account_id=a.id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() LIMIT 1',[digest(token)]);
   if(!rows.length)return json({error:'Session expired or revoked.'},401);
   return json({user:publicUser(rows[0])});
  }
  if(action==='revoke'){
   if(!(await rateLimit('game-revoke',20)))return json({error:'Too many attempts.'},429);
   const user=await currentUser();if(!user)return json({error:'Not signed in.'},401);
   if(!/^[0-9a-f-]{36}$/i.test(String(b.sessionId||'')))return json({error:'Invalid session.'},400);
   await query('UPDATE mokra_game_sessions SET revoked_at=now() WHERE id=$1::uuid AND account_id=$2::uuid',[b.sessionId,user.id]);
   return json({ok:true});
  }
  return json({error:'Unknown action.'},400);
 }catch(e){console.error('game API',e.message);return json({error:'Game account service unavailable.'},503)}
}
