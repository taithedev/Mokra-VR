# Mokra VR account connection

1. Apply `database/migrations/003_playfab_account.sql` to the existing Mokra Neon database. The migration adds tables for links, pairing codes and room tracking.
2. On the Mokra Vercel project, keep the existing server-side `DATABASE_URL` and add `MOKRA_PLAYFAB_TITLE_ID=FFB12` and `MOKRA_PLAYFAB_SECRET_KEY` from PlayFab Game Manager. Keep the key in the hosting project's server environment.
3. Add the existing Photon Realtime App ID as `MOKRA_PHOTON_APP_ID`. Generate a separate random secret of at least 32 characters for `MOKRA_PHOTON_WEBHOOK_SECRET`.
4. In the Photon Realtime dashboard, keep PlayFab custom authentication enabled and anonymous connections disabled. Set the webhook base URL to `https://mokra-vr.vercel.app/api/photon`; set **PathCreate** to `create`, **PathJoin** to `join` and **PathClose** to `close`. Set **CustomHttpHeaders** to a JSON object with `X-Mokra-Photon` set to the webhook secret. Keep persistent rooms off. Room totals start when these webhooks are active. Older events cannot be reconstructed by this migration.
5. In Unity, set the same Photon Realtime App ID on `PhotonVRManager`. The Mokra Testing scene uses website origin `https://mokra-vr.vercel.app` and PlayFab title `FFB12`.

## Player flow

Sign in on the [Mokra account page](https://mokra-vr.vercel.app/account). At the in-game computer press **ACCT**, **3**, **ENTER**. Enter the displayed eight-character code in **Link Device** on the site. The code expires after ten minutes. Reopen the Account tab or press **ENTER** to refresh stats. In the website portal, players can unlink their own connection.

PlayFab remains the authority for owned items, wallets, player statistics and ban history. The website reads them for the linked account. The site shows ban history for already linked players who are blocked from signing in to the game. Photon room counters count a player's entry as an actor, including the creator. Reconnecting as the same actor does not add another entry. A linked player's fur color syncs between the site and the game.

## Smoke test

Use a test website account and a test PlayFab player. Request a code, link it, reopen the game, and verify the link persists. Check a second account cannot redeem the used code. Change fur color in both places and refresh from the other client. Create one room and join with a second player to verify each count changes once. Verify only the matching account can see its history, then unlink and confirm the website no longer displays the PlayFab profile.
