'use client';

import { useEffect, useState } from 'react';

async function request(method, signal) {
  const response = await fetch('/api/playfab', { method, cache: 'no-store', signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'PlayFab profile unavailable.');
  return data;
}

function dateLabel(value) {
  return value ? new Date(value).toLocaleDateString() : '-';
}

export default function PlayFabAccount({ refresh }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    request('GET', controller.signal).then(
      data => { if (!controller.signal.aborted) setProfile(data); },
      failure => { if (!controller.signal.aborted) setError(failure.message); }
    );
    return () => controller.abort();
  }, [refresh, revision]);

  async function unlink() {
    setBusy(true);
    try {
      setProfile(await request('DELETE'));
      setConfirm(false);
      setError('');
      setRevision(value => value + 1);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dashboard-section" aria-labelledby="playfab-title">
      <div className="section-title">
        <div><h3 id="playfab-title">PLAYFAB PROFILE</h3></div>
        <button className="outline-button" type="button" onClick={() => setRevision(value => value + 1)}>REFRESH</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!profile && !error && <p>Loading your PlayFab profile.</p>}
      {profile?.linked === false && <p>Link your game above to see your PlayFab profile here.</p>}
      {profile?.linked && <>
        <p>PlayFab ID <code>{profile.playFabId}</code></p>
        <div className="stat-grid">
          <div><span>ROOMS JOINED</span><b>{profile.roomsAvailable ? profile.roomsJoined : '-'}</b></div>
          {(profile.inventory?.balances ?? []).map(balance =>
            <div key={balance.code}><span>{balance.code} BALANCE</span><b>{balance.amount}</b></div>
          )}
        </div>
        {!profile.roomsAvailable && <p className="hint">Room tracking is waiting for the Photon connection.</p>}
        <details>
          <summary>PlayFab statistics</summary>
          {profile.stats?.length ? <dl>{profile.stats.map(stat =>
            <div key={stat.name}><dt>{stat.name}</dt><dd>{stat.value}</dd></div>
          )}</dl> : <p>{profile.stats === null ? 'Statistics are unavailable.' : 'No PlayFab statistics yet.'}</p>}
        </details>
        <details>
          <summary>Owned items</summary>
          {profile.inventory?.items?.length ? <ul>{profile.inventory.items.map(item =>
            <li key={item.id}>{item.name}{item.count > 1 && ` x ${item.count}`}</li>
          )}</ul> : <p>{profile.inventory === null ? 'Inventory is unavailable.' : 'No owned items.'}</p>}
        </details>
        <details>
          <summary>Ban history</summary>
          {profile.bans?.length ? <ul>{profile.bans.map((ban, index) =>
            <li key={index}><b>{ban.status}</b> � Issued {dateLabel(ban.createdAt)}
              {ban.expiresAt ? ` � Ends ${dateLabel(ban.expiresAt)}` : ' � No expiry'}
              {ban.reason && <p>{ban.reason}</p>}
            </li>
          )}</ul> : <p>{profile.bansAvailable ? 'No PlayFab ban records.' : 'Ban history is unavailable.'}</p>}
        </details>
        {confirm ? <div>
          <p>Linking this PlayFab profile again will require a new code.</p>
          <button className="outline-button" type="button" disabled={busy} onClick={unlink}>CONFIRM UNLINK</button>
          <button className="outline-button" type="button" disabled={busy} onClick={() => setConfirm(false)}>CANCEL</button>
        </div> : <button className="outline-button" type="button" onClick={() => setConfirm(true)}>UNLINK PLAYFAB</button>}
      </>}
    </section>
  );
}
