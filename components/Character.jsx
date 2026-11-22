'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

// Put the ORIGINAL game model at public/models/mokra-player.glb to use it on this site.
// Until that asset is supplied, this procedural stand-in follows the supplied screenshots:
// wide T-pose arms, rounded pale head, dark eyes, pale stomach, long fingers, no legs.
const MODEL_URL = '/models/mokra-player.glb';
const RAINBOW_VERTEX = `
  attribute float aSeed;
  attribute float aMask;
  uniform float uTime;
  varying float vHue;
  varying float vMask;
  varying float vFlicker;
  void main() {
    vec3 p = position;
    float drift = fract(aSeed * 1.173 + uTime * 0.17);
    p.y -= drift * 0.105;
    p.x += sin(uTime * 1.4 + aSeed * 53.1) * 0.012;
    vHue = fract((position.y + 2.45) * 0.167 - uTime * 0.14 + aSeed * 0.035);
    vMask = aMask;
    vFlicker = 0.72 + 0.28 * sin(uTime * 2.5 + aSeed * 49.0);
    vec4 view = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = clamp(30.0 / max(1.0, -view.z), 1.7, 5.6);
  }
`;
const RAINBOW_FRAGMENT = `
  uniform vec3 uBase;
  uniform float uRainbow;
  varying float vHue;
  varying float vMask;
  varying float vFlicker;
  vec3 hueToRgb(float h) {
    vec3 p = abs(fract(vec3(h) + vec3(1.0, .666667, .333333)) * 6.0 - 3.0);
    return clamp(p - 1.0, 0.0, 1.0);
  }
  void main() {
    float radius = length(gl_PointCoord - .5);
    if(radius > .5) discard;
    float core = smoothstep(.39, .06, radius);
    vec3 spectral = mix(vec3(.09, .18, .96), hueToRgb(vHue), uRainbow);
    vec3 pigment = mix(uBase, spectral, .83);
    pigment = mix(pigment, vec3(.94, .97, 1.0), vMask * .83);
    float brightness = (1.0 + .7 * vFlicker) * (1.0 - .2 * vMask);
    gl_FragColor = vec4(pigment * brightness, core * .91);
  }
`;
const RAIN_VERTEX = `
  attribute float aSeed;
  uniform float uTime;
  varying float vHue;
  varying float vStrength;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + 2.8 - (uTime * (.34 + aSeed * .36)), 5.6) - 2.8;
    p.x += sin(uTime * .32 + aSeed * 68.0) * .08;
    vHue = fract((p.y + 2.8) * .17 - uTime * .07 + aSeed * .08);
    vStrength = .45 + .55 * fract(aSeed * 7.13);
    vec4 view = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = clamp((8.0 + aSeed * 18.0) / max(1.0, -view.z), 1.0, 3.6);
  }
`;
const RAIN_FRAGMENT = `
  uniform float uRainbow;
  varying float vHue;
  varying float vStrength;
  vec3 hueToRgb(float h){
    vec3 p = abs(fract(vec3(h) + vec3(1.0, .666667, .333333)) * 6.0 - 3.0);
    return clamp(p - 1.0, 0.0, 1.0);
  }
  void main(){
    float d = length(gl_PointCoord - .5);
    if(d > .5) discard;
    vec3 rgb = mix(vec3(.24,.44,1.0), hueToRgb(vHue), uRainbow);
    gl_FragColor = vec4(rgb * 1.4, (1.0 - smoothstep(.08,.5,d)) * vStrength * .64);
  }
`;

function seeded(seed = 7053) {
  let value = seed >>> 0;
  return () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function screenshotStandIn() {
  const group = new THREE.Group();
  const pale = new THREE.MeshStandardMaterial({ color: '#b9c0c8', roughness: .82, metalness: .04 });
  const fur = new THREE.MeshStandardMaterial({ color: '#9ca6b4', roughness: .94, metalness: .02 });
  const belly = new THREE.MeshStandardMaterial({ color: '#cdd1d3', roughness: .96 });
  const glossy = new THREE.MeshPhysicalMaterial({ color: '#01030b', roughness: .07, metalness: .38, clearcoat: 1 });
  const rim = new THREE.MeshStandardMaterial({ color: '#d9e0e6', roughness: .5, metalness: .25 });
  const red = new THREE.MeshBasicMaterial({ color: '#a45b61' });
  function ball(x,y,z,sx,sy,sz,mat=fur,tone=0) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 26, 18), mat);
    m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.userData.pointTone=tone;group.add(m);return m;
  }
  function link(a,b,r,mat=fur,tone=0) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(r*.89,r,delta.length(),14,2),mat);
    cylinder.position.copy(start).add(end).multiplyScalar(.5);
    cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    cylinder.userData.pointTone=tone;group.add(cylinder);
    ball(...a,r,r,r,mat,tone);ball(...b,r*.91,r*.91,r*.91,mat,tone);
  }
  // Pear-shaped upper body and long VR locomotion arms.
  ball(0,-.35,-.1,.62,.97,.44,fur);
  ball(0,-.64,-.1,.55,.70,.46,fur);
  ball(0,-.46,.365,.40,.69,.071,belly,1);
  for(const side of [-1,1]){
    ball(side*.57,.23,-.07,.32,.28,.29,fur);
    link([side*.64,.25,-.06],[side*1.95,.18,-.06],.225,fur);
    ball(side*2.11,.18,.005,.29,.21,.19,pale);
    for(let i=0;i<4;i++) {
      const y=.29-i*.08;
      link([side*2.23,y,.045],[side*(2.59-(i===3?.065:0)),y-(i-1.5)*.015,.085],.055,pale);
    }
    // Small distinct thumb.
    link([side*2.03,.02,.14],[side*2.30,-.13,.19],.076,pale);
    ball(side*.50,.96,-.04,.125,.23,.19,pale);
  }
  // Tall, rounded head, visible muzzle, ears and raised brow.
  ball(0,1.0,.03,.53,.64,.46,pale,1);
  ball(0,.87,.437,.39,.42,.077,belly,1);
  ball(0,1.20,.405,.37,.18,.12,pale,1);
  for(const side of [-1,1]){
    ball(side*.254,1.068,.468,.174,.205,.075,rim,1);
    ball(side*.254,1.065,.532,.139,.165,.066,glossy,2);
    ball(side*.226,1.116,.593,.036,.044,.012,rim,2);
    ball(side*.50,1.03,.02,.125,.20,.14,pale,1);
  }
  ball(-.067,.815,.509,.020,.015,.012,glossy,2);
  ball(.067,.815,.509,.020,.015,.012,glossy,2);
  const mouthCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.18,.696,.505),new THREE.Vector3(0,.682,.515),new THREE.Vector3(.18,.704,.505)
  ]);
  const mouth = new THREE.Mesh(new THREE.TubeGeometry(mouthCurve,22,.008,5,false),red);
  mouth.userData.pointTone=2;group.add(mouth);
  group.updateMatrixWorld(true);
  return group;
}
function sampleModel(root,count=24000) {
  root.updateMatrixWorld(true);
  const meshes=[];
  root.traverse(obj=>{
    if(!obj.isMesh || !obj.geometry?.attributes?.position) return;
    let sample;
    try { sample=new MeshSurfaceSampler(obj).build(); } catch { return; }
    const p=obj.geometry.attributes.position;
    const box=new THREE.Box3().setFromBufferAttribute(p);
    const dimensions=new THREE.Vector3();box.getSize(dimensions);
    const weight=Math.max(.02,dimensions.x*dimensions.y+dimensions.y*dimensions.z+dimensions.z*dimensions.x);
    meshes.push({mesh:obj,sample,weight});
  });
  if(!meshes.length) return null;
  const total=meshes.reduce((n,m)=>n+m.weight,0);
  const random=seeded(51283);
  const xyz=new Float32Array(count*3);
  const seeds=new Float32Array(count);
  const masks=new Float32Array(count);
  const position=new THREE.Vector3(),normal=new THREE.Vector3();
  const weights=[];
  let sum=0;
  for(const m of meshes){sum+=m.weight/total;weights.push(sum);}
  for(let i=0;i<count;i++){
    const n=random();let index=weights.findIndex(v=>v>=n);
    if(index<0)index=meshes.length-1;
    const entry=meshes[index];
    entry.sample.sample(position,normal);
    position.applyMatrix4(entry.mesh.matrixWorld);
    xyz[i*3]=position.x; xyz[i*3+1]=position.y; xyz[i*3+2]=position.z;
    seeds[i]=random();masks[i]=entry.mesh.userData.pointTone===1?1:0;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(xyz,3));
  geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
  geometry.setAttribute('aMask',new THREE.BufferAttribute(masks,1));
  geometry.computeBoundingSphere();
  return geometry;
}
function normalizeImported(scene) {
  const root=scene.clone(true);
  const box=new THREE.Box3().setFromObject(root);
  if(box.isEmpty())return root;
  const size=new THREE.Vector3(),center=new THREE.Vector3();
  box.getSize(size);box.getCenter(center);
  const scale=Math.min(5.3/Math.max(size.x,.01),3.1/Math.max(size.y,.01),4.5/Math.max(size.z,.01));
  root.position.sub(center).multiplyScalar(scale);root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  return root;
}
function RainCurtain({enabled=true,quiet=false}){
  const material=useRef();
  const geometry=useMemo(()=>{
    const random=seeded(8106);
    const count=quiet?850:2000;
    const positions=new Float32Array(count*3),seeds=new Float32Array(count);
    for(let i=0;i<count;i++){
      positions[i*3]=(random()-.5)*7;
      positions[i*3+1]=(random()-.5)*5.6;
      positions[i*3+2]=-1.5+(random()-.5)*3.7;
      seeds[i]=random();
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));return g;
  },[quiet]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(({clock})=>{if(material.current)material.current.uniforms.uTime.value=clock.elapsedTime;});
  return <points geometry={geometry} frustumCulled={false} visible={enabled}>
    <shaderMaterial ref={material} vertexShader={RAIN_VERTEX} fragmentShader={RAIN_FRAGMENT} transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={{uTime:{value:0},uRainbow:{value:1}}}/>
  </points>;
}
function Creature({color,variant,rainbow}) {
  const rig=useRef();const dots=useRef();
  const cursor=useRef({x:0,y:0});
  const fallback=useMemo(()=>screenshotStandIn(),[]);
  const [real,setReal]=useState(null);
  // Once a real GLB is present, use its mesh for BOTH the physical model and dots.
  useEffect(()=>{
    let active=true;
    fetch(MODEL_URL,{method:'HEAD'}).then(r=>{
      if(!r.ok)return;
      new GLTFLoader().load(MODEL_URL,gltf=>{
        if(active)setReal(normalizeImported(gltf.scene));
      },undefined,()=>{});
    }).catch(()=>{});
    return ()=>{active=false;};
  },[]);
  const source=real||fallback;
  const particleGeometry=useMemo(()=>sampleModel(source,variant==='mini'?12000:24000),[source,variant]);
  useEffect(()=>()=>particleGeometry?.dispose(),[particleGeometry]);
  const uniforms=useMemo(()=>({uTime:{value:0},uRainbow:{value:1},uBase:{value:new THREE.Color('#426cff')}}),[]);
  useEffect(()=>{uniforms.uBase.value.set(color);uniforms.uRainbow.value=rainbow?1:0;},[uniforms,color,rainbow]);
  useEffect(()=>{
    const move=e=>{cursor.current.x=(e.clientX/window.innerWidth-.5)*2;cursor.current.y=(e.clientY/window.innerHeight-.5)*2;};
    window.addEventListener('pointermove',move,{passive:true});return ()=>window.removeEventListener('pointermove',move);
  },[]);
  useFrame(({clock},delta)=>{
    if(!rig.current)return;
    const t=clock.elapsedTime;
    rig.current.rotation.y=THREE.MathUtils.damp(rig.current.rotation.y,cursor.current.x*.37,2.2,delta);
    rig.current.rotation.x=THREE.MathUtils.damp(rig.current.rotation.x,-cursor.current.y*.08,2.2,delta);
    rig.current.position.y=Math.sin(t*.9)*.047;
    if(dots.current)dots.current.uniforms.uTime.value=t;
  });
  return <>
    <ambientLight intensity={1.1}/><directionalLight position={[2.3,4.5,5]} intensity={2.1}/>
    <directionalLight position={[-3,1,-3]} color={'#4572ff'} intensity={.75}/>
    <RainCurtain quiet={variant==='mini'} />
    <group ref={rig} scale={variant==='mini'?.92:1}>
      <primitive object={source}/>
      {particleGeometry&&<points geometry={particleGeometry} frustumCulled={false}>
        <shaderMaterial ref={dots} vertexShader={RAINBOW_VERTEX} fragmentShader={RAINBOW_FRAGMENT} transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={uniforms}/>
      </points>}
    </group>
  </>;
}
export default function Character({color='#426cff',variant='hero',rainbow=true}) {
  return <div className={'mk-character mk-character--'+variant} role="img" aria-label="Mokra player with animated circular rainbow point rain, reacting to your cursor">
    <Canvas dpr={[1,1.6]} gl={{alpha:true,antialias:true,powerPreference:'high-performance'}} camera={{position:[0,.06,variant==='mini'?8.5:7.25],fov:38}}>
      <Creature color={color} variant={variant} rainbow={rainbow}/>
    </Canvas>
  </div>;
}
