import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const character=readFileSync(new URL('../components/Character.jsx',import.meta.url),'utf8');
test('uses the user's uploaded Mokra player geometry',()=>{
  assert.match(character,/models\/mokra-player\.glb/);
  assert.match(character,/new MeshSurfaceSampler\(obj\)/);
  assert.match(character,/samplePoints\(model,/);
});
test('the solid original is a hidden hover raycast proxy',()=>{
  assert.match(character,/colorWrite:false,depthWrite:false/);
  assert.match(character,/raycaster\.intersectObject\(model,true\)/);
});
test('rainbow circular dots include real eye and mouth regions',()=>{
  assert.match(character,/gl_PointCoord/);
  assert.match(character,/aFeature/);
  assert.match(character,/mokraFeature=feature/);
  assert.match(character,/vFeature>1\.5/);
});
test('Mokra AI speaks through a dot-only mouth',()=>{
  assert.match(character,/function TalkingMouth/);
  assert.match(character,/return <points ref=\{mouth\}/);
});
