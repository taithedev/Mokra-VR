# MOKRA — VR Game Website & Account Portal

Original MOKRA branding and a 3D cursor-reactive procedural character. Inspired by immersive VR-game landing pages, but it does **not** reuse any GILLA game assets, source code, logo, or player model.

## What's built

- Cinematic responsive landing page, interactive 3D creature with cursor tracking, selectable fur colors, game-mode concept sections, FAQ, responsive navigation, and original branding.
- Account registration and login using a username and password (no email required), scrypt password hashes with random per-user salts, revocable, database-backed HttpOnly SameSite web sessions, and Postgres-backed rate limits.
- Secure player dashboard: display name, appearance, level, runs, shards, active game sessions, remote device revocation, and account deletion.
- Device-code pairing protocol to link a Unity/Meta Quest/PCVR session to a website account without typing passwords in the headset.
- Postgres database already provisioned in Neon as `Mokra` (`ancient-band-52843062`), database `mokra`, with the schema in `database/schema.sql`.
- A Unity 6 / Unity 2022+ integration example in `public/unity/MokraAccountLink.cs`.

**State:** Source code + database schema are present. The frontend cannot be used publicly until it is deployed and the environment secrets are configured. The actual VR game still needs to implement the client script, UI, and stat updates. Game modes described on the landing page are **concepts**, not existing published modes.

## Deploy

1. Create a new Next.js project on Vercel (or another Node-compatible host) and upload this source code / link your own GitHub repository.
2. Open the existing **Mokra** Neon project, select database `mokra`, and copy the PostgreSQL connection string. Put it in Vercel's server-side `DATABASE_URL` environment variable for production and preview.
3. Run the additive migration at `database/migrations/002_profile_and_sessions.sql` if setting up a new database. Browser sessions are now stored securely in Neon; no `SESSION_SECRET` is needed. **Never put credentials in `NEXT_PUBLIC_` variables or GitHub.**
4. Run `npm install`, `npm run build`, then deploy. Use Node 22+.
5. Visit `/api/health`; it returns `{ "status": "ok", "database": "connected" }` when database access works. Try registering a disposable account, customizing color, signing out/in, and deleting it before public launch.
6. Before public release, add an actual privacy contact/support channel and complete a moderation, security, accessibility, and legal review. Password-only accounts have **no password-recovery flow** yet, so consider adding optional verified email recovery.

The OpenAI-connected Vercel tool was unable to create a project due to a Vercel permissions error (403). This does not affect the actual Neon database or local source code.

## Game linking flow

**Player in Unity**

1. Call `POST /api/game` with `{ "action": "start", "deviceName": "Quest 3" }` (without credentials). The response contains an 8-character code, pollToken and 600-second expiry.
2. Show the code and `https://YOUR-SITE/account` to the player. Keep `pollToken` private and in memory.
3. Poll `POST /api/game` with `{ "action": "status", "pollToken": "..." }` every 4 seconds. The first response with `status: linked` includes a **one-time** `accessToken`. If Unity stops polling and misses it, request a fresh code.
4. To fetch a profile, call `POST /api/game` with `{ "action": "profile" }` and `Authorization: Bearer <accessToken>`.
5. In the player portal, revoke a headset; its access token immediately stops working.

**Player on website**

1. Sign in, open the account dashboard, enter the code and choose **Link device**.
2. The site approves one pending session. The headset receives a separate game token, never the password or session cookie.

Only profile reads are provided to the game. Game progress updates must be implemented in your trusted game backend, not from an untrusted Unity client, to prevent players awarding themselves levels or shards.

## Security notes / next production steps

- Do not ship the Neon connection string to Unity or browser code; only the Next.js server reads it.
- Never give admin rights based solely on a chosen username. Owner/staff identity and permissions need a verified invite/claim flow if added.
- The website should be served over HTTPS; the session cookie is Secure in production.
- Rate limits are Postgres backed. Clean expired rate-limit and pairing rows periodically when the site scales.
- Website sessions are stored by token hash in `mokra_web_sessions`. Sign-out revokes a browser session and password changes sign out other browsers.
- This is a functional starter, not an audited authentication provider; for large public launch consider a mature auth provider with recovery, MFA, secure device management, and abuse reporting.

## File map

- `app/page.jsx` home
- `components/Character.jsx` original interactive procedural character
- `app/account/page.jsx` register, sign in, settings, game-link UI
- `app/api/auth/route.js` username/password auth
- `app/api/me/route.js` profile + account deletion
- `app/api/game/route.js` device pairing + game identity
- `lib/server.js` database adapter, session signing, password hashing, rate limiting
- `database/schema.sql` Neon migration
- `public/unity/MokraAccountLink.cs` Unity game-side client
- `app/globals.css` styling and responsive layout

## Visual refresh — reference recording (November 2026)

The public landing page now uses an original, cinematic dark/blue experience inspired by the *layout and motion* of the site shown in the owner's screen recording: a floating navigation pill, a handwritten MOKRA hero, a blue point-cloud interactive mascot, atmospheric environment illustrations, creature browsing, location cards and player profile CTA. **All artwork and characters in this repository are original Mokra concepts**, not copied GILLA models or game footage.

The account portal and `/api/auth`, `/api/me`, `/api/game`, `/api/health` routes are intentionally unchanged. Server-side `DATABASE_URL` and `SESSION_SECRET` are still required for registration and game pairing. Existing Unity integration remains at `public/unity/MokraAccountLink.cs`.

The 3D mascot uses the real `public/models/mokra-player.glb` mesh and the particle effect is generated procedurally. Original scene illustrations are in `public/scenes/`. Environment, creature and game mode concepts are previews, not claims of finished in-game features.


## Real player mesh (Mokra v5)

The site now includes **the real uploaded \`Monki1.fbx\` geometry**, converted into
\`public/models/mokra-player.glb\` (GLB 2.0, approximately 615 KB) with
separate **Mokra Fur**, **Mokra Mouth**, and **Mokra Eyes** materials. The 3D
preview does not use a procedural replacement. Both hero and player model
sections load this file through Three.js, sample its actual surface for
glowing circular rainbow dots, and react smoothly to the pointer.

The FBX supplied for this update **does not contain its referenced eight
PNG material textures**. The mesh geometry is real; neutral white fur,
dark glossy eyes and a subdued mouth color are included as stand-in
materials until the original texture images are supplied.

The original rig, skeleton weights, and shape keys are not included in
this static website preview GLB. They remain in the supplied source FBX.
The website model can float and track cursor movement; in-game IK and
facial animation need the Unity rig version.

Validate the model with \`node scripts/validate-model.mjs\`.


## Mokra v6 — Appearance and accounts

- Sniglet 400/800 for UI text and section headings; main MOKRA marker title retains its original font.
- Twelve fur-color presets, a custom color selector, RGB tinting on the **real Monki1** fur mesh (eyes/mouth excluded), rainbow or solid particle modes, and 1–4 dot density.
- Neon now stores `fur_color`, `particle_mode`, and `particle_density` on player profiles, and returns them to Unity through the profile API.
- Browser sessions are revocable and stored as SHA-256 token hashes, independent of SESSION_SECRET. Includes change-password and account connection/error states.
- See `README-ACCOUNT-V6.md` for deployment, migration and test steps.
