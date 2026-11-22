## Mokra v7 — Rainbow model and hover interaction

- The original uploaded `Monki1.fbx`-derived `public/models/mokra-player.glb` stays in use.
- The **mesh itself** displays animated full-spectrum rainbow fur when Rainbow is selected; eyes and mouth retain their materials.
- Pointer movement no longer rotates the character. Raycasting detects the precise location under the cursor on the real mesh, and a localized mesh bulge, larger particle dots, and soft glowing halo respond at that spot.
- Solid mode uses the saved color; Rainbow mode flows top-to-bottom.
- Deterministic starfield covers the entire website, including account and legal pages. Stars have reduced-motion support.
- Body copy and controls use regular Sniglet (400). Headers use Sniglet 800. The main hand-painted MOKRA title keeps its distinctive Permanent Marker font.
- Account dashboard lists logged-in website browsers and can revoke other browser sessions without disrupting the active one.
- Existing account credentials, saved appearance data and VR session records are preserved.

### Verification
Run `npm test && npm run build`. The GitHub Actions workflow also checks the real GLB.

The visual effect needs browser/WebGL verification after deployment. The Node/Next.js host still needs the server-side `DATABASE_URL` pointing at the existing Mokra Neon project. Do not commit the database URL to GitHub.
