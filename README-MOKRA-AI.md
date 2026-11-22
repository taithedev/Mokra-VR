# Mokra v8 — Home page + Mokra AI

## Design
- Complete `Monki1.fbx`-derived player model is shown **beside** the large MOKRA wordmark on desktop.
- Narrow screens stack the title and fully framed model instead of cropping its arms.
- Animated full-mesh rainbow coloring and mouse-position glow remain. The model does not chase the cursor.
- Revamped buttons, navigation, cards, FAQ, and responsive layouts.
- Sniglet uses regular weight for ordinary text and bold for headings; the main title keeps Permanent Marker.

## Mokra AI
The assistant appears in a floating button on every page and in a hero CTA.
- Open the chat, send questions, or use the supplied quick-start prompts.
- Spoken responses use the browser's Web Speech Synthesis (no extra TTS API token).
- A separate real Monki GLB render animates its mouth during spoken replies; speech mouth motion is approximate, not phoneme-level lip-sync.
- Voice typing is enabled only when users press the microphone button and when supported by their browser. Do not promise availability in every browser.
- If the backend is missing, the UI explicitly labels a limited **offline game guide** with local, fixed answers. General AI questions require the connected Groq service.
- Server route: `app/api/mokra-ai/route.js`. Groq chat endpoint: `https://api.groq.com/openai/v1/chat/completions`.
- Default model `llama-3.3-70b-versatile`; override via optional `GROQ_MODEL`.
- Rate limits and length limits restrict abuse. Chat history is used only for the current conversation; the website does not store AI conversations in Neon.
- The assistant cannot read private player accounts or in-game state.

## Secure deployment
1. Deploy this repository as a Node 22+ Next.js 16 app on Vercel or another compatible host.
2. Add `DATABASE_URL` as a **server-only** environment variable using your existing `Mokra` Neon project. It is needed for accounts and linking.
3. Add `GROQ_API_KEY` as a **server-only secret** environment variable. The key must NOT be in `app/`, `public/`, `NEXT_PUBLIC_*`, GitHub commits, logs, or a browser.
4. Use the Groq dashboard to revoke/rotate any API key that was pasted into a conversation or otherwise exposed. Put the **new key** in the server environment settings, not the repository.
5. Redeploy, visit `/api/health` and `/api/mokra-ai` to verify the database and AI configuration.
6. Test a real AI message, browser text-to-speech, mouth animation, responsive hero framing, account creation/sign-in and Unity pairing.

## Validation
Run `npm test && node scripts/validate-model.mjs && npm run build`.
The existing GitHub Actions workflow runs these steps after a push.

If the hosting provider rejects project creation or your environment variables are absent, the project can build while live AI and account syncing remain unavailable. Do not describe that state as a live site.
