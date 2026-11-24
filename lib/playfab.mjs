export const validPlayerId = value => typeof value === 'string' && /^[A-F0-9]{4,32}$/i.test(value);

export async function playFab(operation, payload, fetcher = fetch) {
  const title = process.env.MOKRA_PLAYFAB_TITLE_ID;
  const key = process.env.MOKRA_PLAYFAB_SECRET_KEY;
  if (!key || !/^[A-Z0-9]{3,16}$/i.test(title ?? '')) throw new Error('PlayFab configuration missing');
  const response = await fetcher(`https://${title}.playfabapi.com/Server/${operation}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-SecretKey': key },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
    redirect: 'error',
    cache: 'no-store'
  });
  const result = await response.json();
  if (!response.ok || !result.data) {
    if (operation === 'AuthenticateSessionTicket' && response.status < 500 &&
        ['InvalidSessionTicket', 'SessionTicketExpired', 'AccountBanned', 'NotAuthenticated'].includes(result.error))
      return null;
    throw new Error('PlayFab request failed');
  }
  return result.data;
}

export async function verifiedPlayer(ticket, fetcher) {
  if (typeof ticket !== 'string' || !/^[\x21-\x7E]{16,4096}$/.test(ticket)) return null;
  const result = await playFab('AuthenticateSessionTicket', { SessionTicket: ticket }, fetcher);
  const id = result?.UserInfo?.PlayFabId;
  return result?.IsSessionTicketExpired || !validPlayerId(id) ? null : id.toUpperCase();
}

const displayText = (value, length) => typeof value === 'string' ? value.replace(/[\x00-\x1F\x7F]/g, ' ').trim().slice(0, length) : '';
const isoDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;

export function playerBans(data, now = Date.now()) {
  return (Array.isArray(data.BanData) ? data.BanData : []).map(ban => {
    const expiresAt = isoDate(ban.Expires);
    const active = Boolean(ban.Active) && (!expiresAt || Date.parse(expiresAt) > now);
    return {
      reason: displayText(ban.Reason, 240),
      createdAt: isoDate(ban.Created),
      expiresAt,
      status: active ? 'Active' : expiresAt && Date.parse(expiresAt) <= now ? 'Expired' : 'Inactive'
    };
  }).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export function playerInventory(data) {
  const items = new Map();
  for (const item of data.Inventory ?? []) {
    if (typeof item.ItemId !== 'string') continue;
    const id = item.ItemId;
    const name = displayText(item.DisplayName, 96) || id;
    const previous = items.get(id);
    items.set(id, { id, name, count: (previous?.count ?? 0) + 1 });
  }
  const balances = Object.entries(data.VirtualCurrency ?? {}).map(([code, amount]) => ({ code, amount }));
  return { items: [...items.values()], balances };
}
