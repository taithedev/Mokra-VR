import { randomInt } from 'node:crypto';
import { currentUser, digest, json, query, randomToken, rateLimit, verifyOrigin } from '@/lib/server';
import { playFab, playerBans, playerInventory, verifiedPlayer } from '@/lib/playfab.mjs';
import { validColor } from '@/lib/validators.mjs';

export const runtime = 'nodejs';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const validCode = /^[A-HJ-NP-Z2-9]{8}$/;
const validPollToken = /^[a-z0-9_-]{43}$/i;

async function gameProfile(id) {
  const [link] = await query(`SELECT a.display_name, a.fur_color
    FROM mokra_playfab_links l JOIN mokra_accounts a ON a.id=l.account_id
    WHERE l.playfab_id=$1`, [id]);
  const [counts] = await query('SELECT count(*)::int AS count FROM mokra_room_entries WHERE playfab_id=$1', [id]);
  const bans = await playFab('GetUserBans', { PlayFabId: id }).then(playerBans, () => null);
  return { playFabId: id, linked: Boolean(link), roomsJoined: counts.count,
    roomsAvailable: Boolean(process.env.MOKRA_PHOTON_APP_ID && process.env.MOKRA_PHOTON_WEBHOOK_SECRET),
    displayName: link?.display_name ?? null, furColor: link?.fur_color ?? null, bans, bansAvailable: bans !== null };
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return json({ error: 'Sign in first.' }, 401);
    if (!await rateLimit('playfab-account-read', 24)) return json({ error: 'Try again shortly.' }, 429);
    const [link] = await query('SELECT playfab_id FROM mokra_playfab_links WHERE account_id=$1', [user.id]);
    if (!link) return json({ linked: false });
    const id = link.playfab_id;
    const [profile, inventory, stats] = await Promise.all([
      gameProfile(id),
      playFab('GetUserInventory', { PlayFabId: id }).then(playerInventory, () => null),
      playFab('GetPlayerStatistics', { PlayFabId: id }).then(data =>
        (data.Statistics ?? []).map(entry => ({ name: entry.StatisticName, value: entry.Value })), () => null)
    ]);
    return json({ ...profile, inventory, stats });
  } catch {
    return json({ error: 'PlayFab account service unavailable.' }, 503);
  }
}

async function approve(request, body) {
  if (!verifyOrigin(request)) return json({ error: 'Request origin not allowed.' }, 403);
  const user = await currentUser();
  if (!user) return json({ error: 'Sign in first.' }, 401);
  if (!await rateLimit('playfab-approve', 8)) return json({ error: 'Too many attempts.' }, 429);
  const code = String(body.code ?? '').toUpperCase().replace(/[\s-]/g, '');
  if (!validCode.test(code)) return json({ error: 'Enter the eight-character code.' }, 400);
  const [result] = await query(`WITH claimed AS (
      UPDATE mokra_playfab_pairings SET claimed_at=now()
      WHERE code_hash=$1 AND claimed_at IS NULL AND expires_at>now() RETURNING playfab_id
    ), linked AS (
      INSERT INTO mokra_playfab_links (account_id,playfab_id)
      SELECT $2,playfab_id FROM claimed ON CONFLICT DO NOTHING RETURNING playfab_id
    )
    SELECT EXISTS(SELECT 1 FROM claimed) AS claimed,
      (EXISTS(SELECT 1 FROM linked) OR EXISTS(
        SELECT 1 FROM claimed c JOIN mokra_playfab_links l ON c.playfab_id=l.playfab_id WHERE l.account_id=$2
      )) AS linked`, [digest(code), user.id]);
  if (!result.claimed) return json({ error: 'Code expired or already used.' }, 404);
  if (!result.linked) return json({ error: 'One of these accounts is already linked.' }, 409);
  return json({ linked: true });
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (!body || typeof body.action !== 'string') return json({ error: 'Invalid request.' }, 400);
  try {
    if (body.action === 'approve') return await approve(request, body);
    if (body.action === 'status') {
      if (!await rateLimit('playfab-poll', 100)) return json({ error: 'Too many polls.' }, 429);
      if (typeof body.pollToken !== 'string' || !validPollToken.test(body.pollToken))
        return json({ error: 'Invalid poll token.' }, 400);
      const [record] = await query(`SELECT EXISTS(SELECT 1 FROM mokra_playfab_links l WHERE l.playfab_id=p.playfab_id)
        AS linked, (p.claimed_at IS NOT NULL) AS claimed
        FROM mokra_playfab_pairings p WHERE poll_hash=$1 AND expires_at>now()`, [digest(body.pollToken)]);
      return json({ status: !record ? 'expired' : record.linked ? 'linked' : record.claimed ? 'conflict' : 'pending' });
    }

    if (!['profile', 'start', 'appearance'].includes(body.action)) return json({ error: 'Unknown action.' }, 400);
    if (!await rateLimit('playfab-native-' + body.action, body.action === 'start' ? 6 : 40))
      return json({ error: 'Try again shortly.' }, 429);
    const id = await verifiedPlayer(request.headers.get('authorization')?.replace(/^Bearer\s+/i, ''));
    if (!id) return json({ error: 'Sign in to PlayFab again.' }, 401);
    if (body.action === 'profile') return json(await gameProfile(id));
    if (body.action === 'appearance') {
      if (!validColor(body.furColor)) return json({ error: 'Invalid fur color.' }, 400);
      const rows = await query(`UPDATE mokra_accounts a SET fur_color=$1,updated_at=now()
        FROM mokra_playfab_links l WHERE l.account_id=a.id AND l.playfab_id=$2 RETURNING a.fur_color`,
      [body.furColor.toLowerCase(), id]);
      return rows.length ? json({ linked: true, furColor: rows[0].fur_color }) : json({ error: 'Account link was removed.' }, 409);
    }
    const [link] = await query('SELECT 1 FROM mokra_playfab_links WHERE playfab_id=$1', [id]);
    if (link) return json({ status: 'linked' });
    const code = Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join('');
    const pollToken = randomToken();
    await query('INSERT INTO mokra_playfab_pairings (code_hash,poll_hash,playfab_id) VALUES ($1,$2,$3)',
      [digest(code), digest(pollToken), id]);
    return json({ status: 'pending', code, pollToken, expiresIn: 600 });
  } catch {
    return json({ error: 'PlayFab account service unavailable.' }, 503);
  }
}

export async function DELETE(request) {
  try {
    if (!verifyOrigin(request)) return json({ error: 'Request origin not allowed.' }, 403);
    const user = await currentUser();
    if (!user) return json({ error: 'Sign in first.' }, 401);
    if (!await rateLimit('playfab-unlink', 8)) return json({ error: 'Too many attempts.' }, 429);
    await query(`WITH removed AS (DELETE FROM mokra_playfab_links WHERE account_id=$1 RETURNING playfab_id)
      DELETE FROM mokra_playfab_pairings p USING removed r WHERE p.playfab_id=r.playfab_id`, [user.id]);
    return json({ linked: false });
  } catch {
    return json({ error: 'Could not unlink your PlayFab account.' }, 503);
  }
}
