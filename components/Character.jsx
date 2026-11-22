'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

const MODEL_PATH = '/models/mokra-player.glb';
const SURFACE_VERTEX = `
  attribute float aRandom;
  attribute float aFace;
  uniform float uTime;
  uniform float uSize;
  varying float vHue;
  varying float vFace;
  varying float vTwinkle;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 1.8 + aRandom * 61.0) * .004;
    p.y += sin(uTime * 1.4 + aRandom * 39.0) * .003;
    vHue = fract((position.y + 2.6) * .25 + uTime * .20);
    vFace = aFace;
    vTwinkle = .78 + .22 * sin(uTime * 3.2 + aRandom * 81.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(uSize / max(1., -mv.z), 1.4, 5.2);
  }
`;
const SURFACE_FRAGMENT = `
  uniform vec3 uBaseColor;
  uniform float uSpectrum;
  varying float vHue;
  varying float vFace;
  varying float vTwinkle;
  vec3 rainbow(float h) {
    return .22 + .78 * clamp(abs(fract(h + vec3(0., .66667, .33333)) * 6. - 3.) - 1., 0., 1.);
  }
  void main() {
    float r = length(gl_PointCoord - vec2(.5));
    if (r > .5) discard;
    float core = 1. - smoothstep(.05, .48, r);
    vec3 color = mix(uBaseColor, rainbow(vHue), uSpectrum);
    color = mix(color, vec3(.92, .94, 1.), vFace * .88);
    float alpha = core * vTwinkle * mix(.95, .38, vFace);
    gl_FragColor = vec4(color * 1.65, alpha);
  }
`;
const FALL_VERTEX = `
  attribute float aSeed;
  uniform float uTime;
  varying float vHue;
  varying float vGlow;
  void main() {
    vec3 p = position;
    p.y = 3.15 - mod(3.15 - position.y + uTime * (.45 + aSeed * .9), 6.3);
    p.x += sin(uTime * .48 + aSeed * 80.) * .075;
    vHue = fract((p.y + 3.15) * .19 + uTime * .12 + aSeed * .08);
    vGlow = .38 + aSeed * .62;
    vec4 mv = modelViewMatrix * vec4(p,1.);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp((9. + 16. * aSeed) / max(1., -mv.z), 1., 3.9);
  }
`;
const FALL_FRAGMENT = `
  varying float vHue;
  varying float vGlow;
  vec3 rainbow(float h) {
    return .20 + .80 * clamp(abs(fract(h + vec3(0., .66667, .33333))*6. - 3.) - 1., 0., 1.);
  }
  void main() {
    float r = length(gl_PointCoord - vec2(.5));
    if(r > .5) discard;
    float a = (1. - smoothstep(.08, .50, r)) * vGlow * .68;
    gl_FragColor = vec4(rainbow(vHue) * 1.6, a);
  }
`;

function randomSeed(seed) {
  let n = seed >>> 0;
  return () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296);
}

function screenshotCreature() {
  // Original geometric recreation based on the supplied model screenshots.
  // Its shape is deliberately replaceable by the user's own GLB.
  const root = new THREE.Group();
  const face = new THREE.MeshStandardMaterial({color:'#c8cdd6',roughness:.87});
  const fur = new THREE.MeshStandardMaterial({color:'#aab4c4',roughness:.96});
  const belly = new THREE.MeshStandardMaterial({color:'#d8dce1',roughness:1});
  const rim = new THREE.MeshStandardMaterial({color:'#d3d9e2',roughness:.55,metalness:.06});
  const eye = new THREE.MeshPhysicalMaterial({color:'#01050c',metalness:.28,roughness:.055,clearcoat:1,clearcoatRoughness:.035});
  const mouthMaterial = new THREE.MeshBasicMaterial({color:'#b36b76'});
  const rand = randomSeed(28234);

  function ellipsoid(x,y,z,sx,sy,sz,material=fur,mask=0,rough=false) {
    const geo = new THREE.SphereGeometry(1,40,28);
    if(rough) {
      const pos = geo.attributes.position;
      for(let i=0;i<pos.count;i++) {
        const v = new THREE.Vector3().fromBufferAttribute(pos,i);
        const ripple = 1 + (rand()-.5)*.026;
        v.multiplyScalar(ripple);
        pos.setXYZ(i,v.x,v.y,v.z);
      }
      geo.computeVertexNormals();
    }
    const m = new THREE.Mesh(geo,material);
    m.position.set(x,y,z);m.scale.set(sx,sy,sz);
    m.userData.faceMask=mask;root.add(m);
    return m;
  }
  function tapered(a,b,rA,rB,material=fur,mask=0) {
    const start = new THREE.Vector3(...a),end = new THREE.Vector3(...b);
    const diff = end.clone().sub(start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rB,rA,diff.length(),22,5),material);
    mesh.position.copy(start).add(end).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.clone().normalize());
    mesh.userData.faceMask=mask;root.add(mesh);
    ellipsoid(...a,rA,rA,rA,material,mask,true);
    ellipsoid(...b,rB,rB,rB,material,mask,true);
  }
  // A legless, elongated chest with a broad pale oval belly.
  ellipsoid(0,-.31,-.08,.54,.91,.39,fur,0,true);
  ellipsoid(0,.27,-.12,.66,.36,.38,fur,0,true);
  ellipsoid(0,-.46,.304,.392,.67,.095,belly,1);
  ellipsoid(0,-.51,.401,.31,.54,.025,belly,1);

  for(const side of [-1,1]) {
    const s=side;
    ellipsoid(s*.58,.27,-.07,.27,.27,.27,fur,0,true);
    tapered([s*.63,.28,-.055],[s*1.43,.27,-.065],.255,.205,fur);
    tapered([s*1.43,.27,-.065],[s*2.02,.24,-.04],.20,.135,fur);
    ellipsoid(s*2.17,.22,.035,.265,.139,.13,face,1);
    for(let finger=0;finger<3;finger++){
      const fy=.315-finger*.095;
      const length=finger===1?.52:.43;
      const handStart=[s*2.32,fy,.04];
      const handEnd=[s*(2.32+length),fy+(finger===0?.045:-.025),.065];
      tapered(handStart,handEnd,.072,.038,face,1);
    }
    tapered([s*2.09,.105,.09],[s*2.33,-.085,.22],.086,.043,face,1);
    // Discrete ears just outside the round head.
    ellipsoid(s*.505,1.023,-.06,.132,.215,.16,face,1);
    ellipsoid(s*.55,1.03,.078,.075,.119,.029,belly,1);
  }

  ellipsoid(0,1.035,-.01,.515,.62,.448,face,1);
  ellipsoid(0,.919,.372,.426,.36,.128,belly,1);
  ellipsoid(0,1.291,.314,.35,.20,.13,face,1);
  // Glossy oval eyes sit inside raised pale sockets.
  for(const side of [-1,1]){
    ellipsoid(side*.236,1.106,.416,.196,.209,.09,rim,1);
    ellipsoid(side*.236,1.103,.486,.156,.170,.061,eye,2);
    ellipsoid(side*.211,1.163,.541,.033,.041,.012,belly,2);
    ellipsoid(side*.10,.833,.490,.017,.012,.013,eye,2);
  }
  const smile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.173,.728,.473),
    new THREE.Vector3(-.075,.712,.489),
    new THREE.Vector3(.055,.709,.491),
    new THREE.Vector3(.174,.735,.472)
  ]);
  const mouth = new THREE.Mesh(new THREE.TubeGeometry(smile,28,.009,6,false),mouthMaterial);
  mouth.userData.faceMask=2;root.add(mouth);
  root.updateMatrixWorld(true);
  return root;
}

function normalizeModel(model) {
  const root=model.clone(true);
  const bbox=new THREE.Box3().setFromObject(root);
  if(bbox.isEmpty())return root;
  const center=new THREE.Vector3(),size=new THREE.Vector3();
  bbox.getCenter(center);bbox.getSize(size);
  const scale=Math.min(5.7/Math.max(size.x,.001),3.0/Math.max(size.y,.001),3.6/Math.max(size.z,.001));
  root.scale.setScalar(scale);
  root.position.copy(center).multiplyScalar(-scale);
  root.updateMatrixWorld(true);
  return root;
}

function samplePoints(source,count=35000) {
  source.updateMatrixWorld(true);
  const parts=[];
  let total=0;
  source.traverse(obj=>{
    if(!obj.isMesh || !obj.geometry?.attributes?.position)return;
    let sampler;
    try {sampler=new MeshSurfaceSampler(obj).build();} catch {return;}
    const scale=new THREE.Vector3();
    obj.getWorldScale(scale);
    const bounds=new THREE.Box3().setFromObject(obj);
    const size=new THREE.Vector3();bounds.getSize(size);
    const approx=Math.max(.003,size.x*size.y+size.y*size.z+size.z*size.x);
    total+=approx; parts.push({obj,sampler,approx,cutoff:total});
  });
  if(!parts.length)return null;
  const rand=randomSeed(15110);
  const pos=new Float32Array(count*3);
  const seeds=new Float32Array(count),faces=new Float32Array(count);
  const v=new THREE.Vector3(),normal=new THREE.Vector3();
  for(let i=0;i<count;i++){
    const target=rand()*total;
    let part=parts.find(p=>p.cutoff>=target)||parts[parts.length-1];
    part.sampler.sample(v,normal);
    v.applyMatrix4(part.obj.matrixWorld);
    pos[i*3]=v.x;pos[i*3+1]=v.y;pos[i*3+2]=v.z;
    seeds[i]=rand();
    faces[i]=part.obj.userData.faceMask===2?2:part.obj.userData.faceMask===1?1:0;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.setAttribute('aRandom',new THREE.BufferAttribute(seeds,1));
  g.setAttribute('aFace',new THREE.BufferAttribute(faces,1));
  g.computeBoundingSphere();
  return g;
}

function RainbowRain({small=false,paused=false}) {
  const mat=useRef(null);
  const geo=useMemo(()=>{
    const rand=randomSeed(91232),count=small?850:3300;
    const pts=new Float32Array(count*3),seeds=new Float32Array(count);
    for(let i=0;i<count;i++){
      pts[i*3]=(rand()-.5)*8.2;
      pts[i*3+1]=(rand()-.5)*6.3;
      pts[i*3+2]=-1.35+(rand()-.5)*3.5;
      seeds[i]=rand();
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(pts,3));
    geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
    return geometry;
  },[small]);
  useEffect(()=>()=>geo.dispose(),[geo]);
  const uniforms=useMemo(()=>({uTime:{value:0}}),[]);
  useFrame(({clock})=>{if(mat.current&&!paused)mat.current.uniforms.uTime.value=clock.elapsedTime;});
  return <points geometry={geo} frustumCulled={false}>
    <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={FALL_VERTEX} fragmentShader={FALL_FRAGMENT} transparent depthWrite={false} blending={THREE.AdditiveBlending}/>
  </points>;
}

function Stage({color,variant,rainbow=true,paused=false}) {
  const group=useRef(null),dots=useRef(null);
  const move=useRef({x:0,y:0});
  const fallback=useMemo(()=>screenshotCreature(),[]);
  const [loaded,setLoaded]=useState(null);
  useEffect(()=>{
    let current=true;
    fetch(MODEL_PATH,{method:'HEAD'}).then(r=>{
      if(!r.ok||!current)return;
      new GLTFLoader().load(MODEL_PATH,g=>{
        if(current)setLoaded(normalizeModel(g.scene));
      },undefined,()=>{});
    }).catch(()=>{});
    return ()=>{current=false;};
  },[]);
  const model=loaded||fallback;
  const points=useMemo(()=>samplePoints(model,variant==='mini'?12000:38000),[model,variant]);
  useEffect(()=>()=>points?.dispose(),[points]);
  const uniforms=useMemo(()=>({uTime:{value:0},uBaseColor:{value:new THREE.Color('#517aff')},uSpectrum:{value:1},uSize:{value:25}}),[]);
  useEffect(()=>{
    uniforms.uBaseColor.value.set(color||'#517aff');
    uniforms.uSpectrum.value=rainbow?1:0;
  },[color,rainbow,uniforms]);
  useEffect(()=>{
    if(typeof window==='undefined')return;
    const onMove=e=>{
      move.current.x=(e.clientX/window.innerWidth-.5)*2;
      move.current.y=(e.clientY/window.innerHeight-.5)*2;
    };
    window.addEventListener('pointermove',onMove,{passive:true});
    return ()=>window.removeEventListener('pointermove',onMove);
  },[]);
  useFrame(({clock},dt)=>{
    if(group.current){
      const t=clock.elapsedTime;
      group.current.rotation.y=THREE.MathUtils.damp(group.current.rotation.y,move.current.x*.30,2.5,dt);
      group.current.rotation.x=THREE.MathUtils.damp(group.current.rotation.x,-move.current.y*.092,2.5,dt);
      group.current.position.y=paused?0:Math.sin(t*.73)*.05;
    }
    if(dots.current&&!paused)dots.current.uniforms.uTime.value=clock.elapsedTime;
  });
  return <>
    <ambientLight intensity={1.28}/>
    <directionalLight position={[2.3,4.5,5]} intensity={2.4}/>
    <directionalLight position={[-4,1,-3]} color="#335bff" intensity={1.2}/>
    <pointLight position={[0,-1,3]} color="#8f56ff" intensity={.8}/>
    <RainbowRain small={variant==='mini'} paused={paused}/>
    <group ref={group} scale={variant==='mini'?.92:1}>
      <primitive object={model}/>
      {points&&<points geometry={points} frustumCulled={false}>
        <shaderMaterial ref={dots} uniforms={uniforms} vertexShader={SURFACE_VERTEX} fragmentShader={SURFACE_FRAGMENT} transparent depthWrite={false} blending={THREE.AdditiveBlending}/>
      </points>}
    </group>
  </>;
}

export default function Character({color='#507cff',variant='hero',rainbow=true}) {
  const [reduced,setReduced]=useState(false);
  useEffect(()=>{
    const q=window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync=()=>setReduced(q.matches);
    sync();q.addEventListener?.('change',sync);
    return ()=>q.removeEventListener?.('change',sync);
  },[]);
  return <div className={'mk-character mk-character--'+variant} role="img" aria-label="Interactive long-armed Mokra creature covered in descending rainbow light dots">
    <Canvas dpr={[1,1.5]} gl={{alpha:true,antialias:true,powerPreference:'high-performance'}} camera={{position:[0,.18,variant==='mini'?8.7:7.6],fov:39}} frameloop="always">
      <Stage color={color} variant={variant} rainbow={rainbow} paused={reduced}/>
    </Canvas>
  </div>;
}
