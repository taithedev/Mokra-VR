import { neon } from '@neondatabase/serverless';
import { cookies, headers } from 'next/headers';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

const SESSION_COOKIE = 'mokra_session';
const TWO_WEEKS = 14 * 86400;

export function query(text, params = []) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not configured');
  return neon(url).query(text, params);
}
export const json = (data, status=200) => Response.json(data, {status,headers:{
  'Cache-Control':'no-store, no-cache, must-revalidate',
  'X-Content-Type-Options':'nosniff'
}});
export const digest = value => createHash('sha256').update(value).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');

export function hashPassword(password) {
  const salt=randomBytes(16).toString('hex');
  return salt+':'+scryptSync(password,salt,64).toString('hex');
}
export function verifyPassword(password,stored) {
  try {
    const [salt,hex]=stored.split(':');
    const actual=scryptSync(password,salt,64),expected=Buffer.from(hex,'hex');
    return actual.length===expected.length && timingSafeEqual(actual,expected);
  }catch {return false;}
}
export function verifyOrigin(request) {
  const origin=request.headers.get('origin');
  if(!origin) return true; // Native Unity clients do not send a browser Origin.
  try {return new URL(origin).origin===new URL(request.url).origin;}
  catch{return false;}
}
export function publicUser(u) {
  return {
    id:u.id,username:u.username,displayName:u.display_name,furColor:u.fur_color,
    particleMode:u.particle_mode||'rainbow',particleDensity:u.particle_density||2,
    level:u.level,totalRuns:u.total_runs,shards:u.shards,createdAt:u.created_at
  };
}
export async function setSession(id,request) {
  const token=randomToken();
  const userAgent=(request?.headers.get('user-agent')||'').slice(0,180);
  await query('INSERT INTO mokra_web_sessions(account_id,token_hash,user_agent) VALUES ($1::uuid,$2,$3)',[id,digest(token),userAgent]);
  (await cookies()).set(SESSION_COOKIE,token,{
    httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',
    path:'/',maxAge:TWO_WEEKS,priority:'high'
  });
}
export async function clearSession() {
  const jar=await cookies();
  jar.set(SESSION_COOKIE,'',{
    httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',
    path:'/',maxAge:0
  });
}
export async function currentSessionHash() {
  const token=(await cookies()).get(SESSION_COOKIE)?.value;
  return token && /^[A-Za-z0-9_-]{40,100}$/.test(token) ? digest(token) : null;
}
export async function endSession() {
  const token=(await cookies()).get(SESSION_COOKIE)?.value;
  if(token && /^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    await query('DELETE FROM mokra_web_sessions WHERE token_hash=$1',[digest(token)]);
  }
  await clearSession();
}
export async function currentUser() {
  const token=(await cookies()).get(SESSION_COOKIE)?.value;
  if(!token || !/^[A-Za-z0-9_-]{40,100}$/.test(token))return null;
  const rows=await query(`SELECT a.id,a.username,a.display_name,a.fur_color,a.particle_mode,a.particle_density,
    a.level,a.total_runs,a.shards,a.created_at
    FROM mokra_web_sessions s JOIN mokra_accounts a ON a.id=s.account_id
    WHERE s.token_hash=$1 AND s.expires_at>now() LIMIT 1`,[digest(token)]);
  return rows[0]||null;
}
export async function rateLimit(key,maximum=8,seconds=60) {
  const h=await headers();
  const raw=(h.get('x-real-ip')||h.get('x-forwarded-for')?.split(',')[0]||'unknown').slice(0,128);
  const identity=digest(key+':'+digest(raw));
  const rows=await query(`INSERT INTO mokra_rate_limits(key,hits,reset_at)
    VALUES($1,1,now()+($2::int*interval '1 second'))
    ON CONFLICT(key) DO UPDATE SET
    hits=CASE WHEN mokra_rate_limits.reset_at<now() THEN 1 ELSE mokra_rate_limits.hits+1 END,
    reset_at=CASE WHEN mokra_rate_limits.reset_at<now() THEN now()+($2::int*interval '1 second') ELSE mokra_rate_limits.reset_at END
    RETURNING hits`,[identity,seconds]);
  return rows[0].hits<=maximum;
}
