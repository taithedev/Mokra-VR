import { query, json, currentUser, publicUser, rateLimit, verifyPassword, clearSession } from '@/lib/server';
export const runtime='nodejs';
export async function GET(){
 try{
  const user=await currentUser();if(!user)return json({error:'Not signed in.'},401);
  const sessions=await query('SELECT id,device_name,created_at,expires_at FROM mokra_game_sessions WHERE account_id=$1::uuid AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 30',[user.id]);
  return json({user:publicUser(user),sessions});
 }catch(e){console.error('me GET',e.message);return json({error:'Account service unavailable.'},503)}
}
export async function PATCH(req){
 try{
  if(!(await rateLimit('profile',20)))return json({error:'Slow down.'},429);
  const user=await currentUser();if(!user)return json({error:'Not signed in.'},401);
  const b=await req.json(),name=String(b.displayName??user.display_name).trim(),color=String(b.furColor??user.fur_color).toLowerCase();
  if(name.length<1||name.length>32||!/^#[0-9a-f]{6}$/.test(color))return json({error:'Invalid display name or color.'},400);
  const rows=await query('UPDATE mokra_accounts SET display_name=$1,fur_color=$2,updated_at=now() WHERE id=$3::uuid RETURNING id,username,display_name,fur_color,level,total_runs,shards,created_at',[name,color,user.id]);
  return json({user:publicUser(rows[0])});
 }catch(e){console.error('me PATCH',e.message);return json({error:'Could not save profile.'},503)}
}
export async function DELETE(req){
 try{
  if(!(await rateLimit('delete-account',4)))return json({error:'Too many attempts.'},429);
  const user=await currentUser();if(!user)return json({error:'Not signed in.'},401);
  const b=await req.json(),rows=await query('SELECT password_hash FROM mokra_accounts WHERE id=$1::uuid',[user.id]);
  if(!rows.length||!verifyPassword(String(b.password||''),rows[0].password_hash))return json({error:'Incorrect password.'},403);
  await query('DELETE FROM mokra_accounts WHERE id=$1::uuid',[user.id]);await clearSession();return json({ok:true});
 }catch(e){console.error('me DELETE',e.message);return json({error:'Could not delete account.'},503)}
}
