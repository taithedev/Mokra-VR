import { neon } from '@neondatabase/serverless';
import { cookies, headers } from 'next/headers';
import { createHmac, randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

export function query(text, params = []) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured');
  return neon(process.env.DATABASE_URL).query(text, params);
}
export const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export const digest = value => createHash('sha256').update(value).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function verifyPassword(password, stored) {
  try {
    const [salt, hex] = stored.split(':');
    const actual = scryptSync(password, salt, 64);
    const expected = Buffer.from(hex, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}
export const secretPresent = () => typeof process.env.SESSION_SECRET === 'string' && process.env.SESSION_SECRET.length >= 48;
export async function setSession(id) {
  if (!secretPresent()) throw new Error('SESSION_SECRET not configured');
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14;
  const base = id + '.' + exp;
  const mac = createHmac('sha256', process.env.SESSION_SECRET).update(base).digest('base64url');
  (await cookies()).set('mokra_session', base + '.' + mac, { httpOnly:true, sameSite:'lax', secure:process.env.NODE_ENV === 'production', path:'/', maxAge:14*86400 });
}
export async function clearSession() {
  (await cookies()).set('mokra_session','',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV === 'production',path:'/',maxAge:0});
}
export async function currentUser() {
  const token = (await cookies()).get('mokra_session')?.value;
  if (!token || !secretPresent()) return null;
  const [id, exp, mac] = token.split('.');
  if (!/^[0-9a-f-]{36}$/i.test(id||'') || !/^\d+$/.test(exp||'') || Number(exp) <= Date.now()/1000 || !mac) return null;
  const expected = createHmac('sha256', process.env.SESSION_SECRET).update(id+'.'+exp).digest('base64url');
  if (expected.length !== mac.length || !timingSafeEqual(Buffer.from(expected),Buffer.from(mac))) return null;
  const rows = await query('SELECT id,username,display_name,fur_color,level,total_runs,shards,created_at FROM mokra_accounts WHERE id=$1::uuid LIMIT 1',[id]);
  return rows[0] || null;
}
export async function rateLimit(key, maximum=8, seconds=60) {
  const h = await headers();
  const raw = (h.get('x-real-ip')||h.get('x-forwarded-for')?.split(',')[0]||'unknown').slice(0,128);
  const identity = digest(key + ':' + digest(raw));
  const rows = await query("INSERT INTO mokra_rate_limits(key,hits,reset_at) VALUES($1,1,now()+($2::int*interval '1 second')) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN mokra_rate_limits.reset_at < now() THEN 1 ELSE mokra_rate_limits.hits+1 END, reset_at=CASE WHEN mokra_rate_limits.reset_at < now() THEN now()+($2::int*interval '1 second') ELSE mokra_rate_limits.reset_at END RETURNING hits",[identity,seconds]);
  return rows[0].hits <= maximum;
}
export function publicUser(u) {
  return {id:u.id,username:u.username,displayName:u.display_name,furColor:u.fur_color,level:u.level,totalRuns:u.total_runs,shards:u.shards,createdAt:u.created_at};
}
