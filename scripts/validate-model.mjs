import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = 'public/models/mokra-player.glb';
const bytes = fs.readFileSync(path);
assert.equal(bytes.toString('ascii',0,4),'glTF','invalid GLB signature');
assert.equal(bytes.readUInt32LE(4),2,'expected glTF 2.0');
assert.equal(bytes.readUInt32LE(8),bytes.length,'invalid GLB length');
const jsonSize = bytes.readUInt32LE(12);
assert.equal(bytes.toString('ascii',16,20),'JSON','missing JSON chunk');
const scene = JSON.parse(bytes.toString('utf8',20,20+jsonSize));
assert.ok(scene.meshes?.length>=3,'missing the actual exported fur / mouth / eye meshes');
assert.ok(scene.materials.some(x=>/Mokra Fur/.test(x.name)),'missing fur material');
assert.ok(scene.materials.some(x=>/Mokra Eyes/.test(x.name)),'missing eyes material');
assert.ok(scene.buffers?.length,'missing mesh buffers');
assert.ok(scene.accessors?.length,'missing vertex data');
assert.ok(!scene.images?.some(x=>x.uri?.startsWith('file:')),'external file paths should not be referenced');
console.log('Validated Monki1.fbx export:', bytes.length, 'bytes,',scene.meshes.length,'meshes.');
