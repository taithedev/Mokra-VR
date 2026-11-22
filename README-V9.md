# MOKRA v9 — GILLA-inspired dots, using the original Monki

The original `Monki1.fbx` is already exported as `public/models/mokra-player.glb`. This update renders the character as tens of thousands of glowing circular particles **sampled directly from your actual GLB mesh**. No substitute character or GILLA assets are used.

- Fur, eyes and mouth are sampled from your mesh's own triangle surfaces.
- Rainbow stripes flow downward on the dots. Solid mode uses the profile's saved color.
- The original mesh is not visible: it stays as a non-rendering raycast proxy for accurate hover glowing/magnification.
- The fully framed Monki is placed beside the MOKRA title on desktop; the mobile layout stacks them.
- Extra falling dots around the model were removed; the full-site star background remains.
- Mokra AI now also uses the dot-cloud Monki; a dotted mouth moves when it speaks.
- The Neon account service, appearance settings, and Unity linking API are preserved.

Verification: `npm test && node scripts/validate-model.mjs && npm run build` (also in GitHub Actions). WebGL visual behavior needs browser testing after hosting is connected.

This is Mokra's own visual implementation inspired by a reference, not GILLA source code or assets.
