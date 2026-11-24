import { createHash, timingSafeEqual } from 'node:crypto';
import { digest, json, query } from '@/lib/server';
import { validPlayerId } from '@/lib/playfab.mjs';

export const runtime = 'nodejs';
const expectedTypes = { create: 'Create', join: 'Join', close: 'Close' };
const hash = value => createHash('sha256').update(value).digest();

export async function POST(request, { params }) {
  const { event } = await params;
  const secret = process.env.MOKRA_PHOTON_WEBHOOK_SECRET;
  const appId = process.env.MOKRA_PHOTON_APP_ID;
  const supplied = request.headers.get('x-mokra-photon') ?? '';
  if (!appId || !secret || secret.length < 32 || !timingSafeEqual(hash(supplied), hash(secret)))
    return json({ ResultCode: 1 }, 403);
  if (!Object.hasOwn(expectedTypes, event)) return json({ ResultCode: 1 }, 404);
  let data;
  try { data = await request.json(); } catch { return json({ ResultCode: 1 }, 400); }
  if (typeof data?.AppId !== 'string' || data.AppId.toLowerCase() !== appId.toLowerCase() ||
      ![data.GameId, data.Region, data.AppVersion].every(part => typeof part === 'string' && part.length <= 256))
    return json({ ResultCode: 1 }, 400);
  if (data.Type !== expectedTypes[event]) return json({ ResultCode: 0 });

  const key = digest(JSON.stringify([appId, data.Region.toLowerCase(), data.AppVersion, data.GameId]));
  try {
    if (event === 'close') {
      await query('UPDATE mokra_photon_rooms SET active=false WHERE room_key=$1', [key]);
    } else {
      if (!validPlayerId(data.UserId) || !Number.isInteger(data.ActorNr) || data.ActorNr < 1 || data.ActorNr > 2147483647)
        return json({ ResultCode: 0 });
      const id = data.UserId.toUpperCase();
      if (event === 'create') {
        await query(`WITH room AS (
          INSERT INTO mokra_photon_rooms(room_key) VALUES($1)
          ON CONFLICT(room_key) DO UPDATE SET
            generation=CASE WHEN mokra_photon_rooms.active THEN mokra_photon_rooms.generation ELSE gen_random_uuid() END,
            active=true RETURNING generation
        ) INSERT INTO mokra_room_entries(generation,actor_number,playfab_id)
          SELECT generation,$2,$3 FROM room ON CONFLICT DO NOTHING`, [key, data.ActorNr, id]);
      } else {
        await query(`INSERT INTO mokra_room_entries(generation,actor_number,playfab_id)
          SELECT generation,$2,$3 FROM mokra_photon_rooms WHERE room_key=$1 AND active=true
          ON CONFLICT DO NOTHING`, [key, data.ActorNr, id]);
      }
    }
    return json({ ResultCode: 0 });
  } catch {
    return event === 'create' ? json({ ResultCode: 0 }) : json({ ResultCode: 1 }, 503);
  }
}
