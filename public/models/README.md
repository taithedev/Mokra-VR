# Mokra 3D Character / Rainbow Point Cloud

The home page uses an original geometry approximation modeled from the user's screenshots: a pale legless creature, huge dark reflective eyes, long horizontal arms, three-finger hands, a pale belly and small mouth. The physical mesh remains visible under rainbow circular particles, with a separate downwards-falling spectrum rain effect. The model tracks the cursor.

## Replacing the approximation with your real character

Export **your own** rig/mesh as binary glTF in Blender: **File > Export > glTF 2.0 (.glb)**. Export selected objects, apply transforms, and include materials. Name the file exactly **mokra-player.glb** and add it in this folder: **public/models/mokra-player.glb**. The website will then load your model and sample actual mesh surfaces for rainbow dots automatically.

Keep the mesh facing the +Z direction and avoid exporting stage/camera/environment objects. The model is automatically recentered and normalized. Web preview and game model are separate; the Unity project retains the rigged master.

The supplied screenshot is not a mesh or model file. Exact topology and texture matching require the original FBX/Blend/GLB file; this site does not copy GILLA's restricted model or other game assets.
