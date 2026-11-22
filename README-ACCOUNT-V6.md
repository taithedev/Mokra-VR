# Mokra v6: deployment and account verification

The original uploaded Monki1 mesh remains at `public/models/mokra-player.glb`.

## Features
- Sniglet on the site except the main MOKRA title.
- Twelve fur palettes, custom colors, rainbow/solid particle styles, density 1–4.
- Appearance is stored in Neon and returned to the VR game from `POST /api/game`, action `profile`.
- Revocable browser sessions, password changes, responsive account UI and helpful connection errors.

## Neon
Neon project **Mokra**, id `ancient-band-52843062`; database `mokra`. The additive migration `database/migrations/002_profile_and_sessions.sql` has been applied there. Existing game tables and user information are not deleted.

## Hosting
Set the **server-side** `DATABASE_URL` in your Next.js provider; it must point to database `mokra`. Don't expose it as `NEXT_PUBLIC_*` or include it in a repo. No `SESSION_SECRET` is needed after v6. The site isn't live until hosting is configured.

## Test checklist after deployment
1. Open `/api/health` and verify status ok, database connected and auth ready.
2. Register a test account, reload, verify session persists.
3. Change fur color, particles, density and profile name, save and reload to verify persistence.
4. Change password; prior password should no longer work, new password should succeed.
5. Pair a Unity session with temporary code; check that fur color synchronizes via profile API.
6. Revoke a linked device and confirm it can no longer read player data.
7. Log out and verify `/api/me` returns 401. Delete the disposable test account afterward.

Run `npm test && npm run build`. CI runs both.
