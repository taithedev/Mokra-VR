# Mokra's real player model

The current page shows a procedural **stand-in** made to resemble the supplied front/side screenshots. Screenshots alone are not editable 3D models.

To switch to the *actual* game character:

1. In Blender, select the player character including its mesh, eyes, face, hands and materials.
2. File > Export > glTF 2.0, format **GLB**, Apply Modifiers, +Y Up.
3. Save the resulting binary as `public/models/mokra-player.glb` (exact path/name).
4. Commit that file and deploy the website. The existing 3D scene automatically loads and samples the actual mesh, normalizes its size, and applies the animated rainbow/blue descending point-cloud effect.

Avoid shipping private Unity game scripts, personal data, or third-party character meshes you do not have rights to.

GLB format is preferred over .blend, since browsers cannot load a .blend file directly. Keep exported material textures embedded in the GLB.
