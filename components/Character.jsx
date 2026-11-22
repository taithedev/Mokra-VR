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
  uniform vec3 uHoverPoint;
  uniform float uHoverStrength;
  varying float vHover;
  varying float vHue;
  varying float vFace;
  varying float vTwinkle;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 1.8 + aRandom * 61.0) * .004;
    p.y += sin(uTime * 1.4 + aRandom * 39.0) * .003;
    vec3 worldPoint=(modelMatrix * vec4(p,1.0)).xyz;
    vHover=uHoverStrength * exp(-pow(distance(worldPoint,uHoverPoint) / .39,2.0));
    vHue = fract((worldPoint.y + 2.6) * .25 + uTime * .19);
    vFace = aFace;
    vTwinkle = .78 + .22 * sin(uTime * 3.2 + aRandom * 81.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp((uSize / max(1., -mv.z)) * (1.0 + 3.8 * vHover), 1.4, 25.);
  }
`;
const SURFACE_FRAGMENT = `
  uniform vec3 uBaseColor;
  uniform float uSpectrum;
  varying float vHue;
  varying float vFace;
  varying float vTwinkle;
  varying float vHover;
  vec3 rainbow(float h) {
    return .22 + .78 * clamp(abs(fract(h + vec3(0., .66667, .33333)) * 6. - 3.) - 1., 0., 1.);
  }
  void main() {
    float r = length(gl_PointCoord - vec2(.5));
    if (r > .5) discard;
    float core = 1. - smoothstep(.05, .48, r);
    vec3 color = mix(uBaseColor, rainbow(vHue), uSpectrum);
    color=mix(color,vec3(1.0,.96,.99),clamp(vHover * .85,0.,.85));
    color = mix(color, vec3(.92, .94, 1.), vFace * .88);
    float alpha = core * vTwinkle * mix(.95, .38, vFace) * (1.0 + vHover*.3);
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
  uniform float uSpectrum;
  uniform vec3 uBaseColor;
  varying float vHue;
  varying float vGlow;
  vec3 rainbow(float h) {
    return .20 + .80 * clamp(abs(fract(h + vec3(0., .66667, .33333))*6. - 3.) - 1., 0., 1.);
  }
  void main() {
    float r = length(gl_PointCoord - vec2(.5));
    if(r > .5) discard;
    float a = (1. - smoothstep(.08, .50, r)) * vGlow * .68;
    gl_FragColor = vec4(mix(uBaseColor,rainbow(vHue),uSpectrum) * 1.6, a);
  }
`;

// Shader injection colors the real FBX-derived fur mesh, not just the surrounding dots.
// The uniform hover center is a world-space point on the actual mesh surface.
function applyMokraFurMaterial(mat,fx) {
  if(!mat || !mat.isMeshStandardMaterial)return;
  mat.color.set('#ffffff');
  mat.side=THREE.DoubleSide;
  mat.onBeforeCompile=(shader)=>{
    shader.uniforms.uMokraTime=fx.time;
    shader.uniforms.uMokraColor=fx.color;
    shader.uniforms.uMokraRainbow=fx.rainbow;
    shader.uniforms.uMokraHover=fx.hover;
    shader.uniforms.uMokraStrength=fx.strength;
    shader.vertexShader=shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 vMokraWorld;\nuniform vec3 uMokraHover;\nuniform float uMokraStrength;'
    ).replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec3 mkOriginalWorld=(modelMatrix*vec4(transformed,1.0)).xyz;
      float mkGrow=uMokraStrength*exp(-pow(distance(mkOriginalWorld,uMokraHover)/.38,2.));
      transformed+=normalize(objectNormal)*(.145*mkGrow);
      vMokraWorld=(modelMatrix*vec4(transformed,1.0)).xyz;`
    );
    shader.fragmentShader=shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vMokraWorld;
      uniform float uMokraTime;
      uniform vec3 uMokraColor;
      uniform float uMokraRainbow;
      uniform vec3 uMokraHover;
      uniform float uMokraStrength;`
    ).replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float spectrum=fract(vMokraWorld.y*.28+uMokraTime*.13);
      vec3 rgb=.17+.83*clamp(abs(fract(spectrum+vec3(0.,.666667,.333333))*6.-3.)-1.,0.,1.);
      diffuseColor.rgb=mix(uMokraColor,rgb,uMokraRainbow);
      float touch=uMokraStrength*exp(-pow(distance(vMokraWorld,uMokraHover)/.42,2.));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.96,.99),clamp(touch*.77,0.,.77));`
    );
  };
  mat.customProgramCacheKey=()=> 'mokra-real-model-rainbow-hover-v7';
  mat.needsUpdate=true;
}
function createGlowTexture() {
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  const gradient=ctx.createRadialGradient(64,64,3,64,64,64);
  gradient.addColorStop(0,'rgba(255,255,255,1)');
  gradient.addColorStop(.14,'rgba(255,255,255,.92)');
  gradient.addColorStop(.35,'rgba(255,255,255,.35)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}

function randomSeed(seed) {
  let n = seed >>> 0;
  return () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296);
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
    // Keep the real glossy eye and mouth materials visible under the rainbow points.
    if(/eye|mouth/i.test(String(obj.material?.name||'')+' '+obj.name))return;
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

function RainbowRain({small=false,paused=false,rainbow=true,color='#476bff'}) {
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
  const uniforms=useMemo(()=>({uTime:{value:0},uSpectrum:{value:1},uBaseColor:{value:new THREE.Color('#476bff')}}),[]);
  useEffect(()=>{uniforms.uSpectrum.value=rainbow?1:0;uniforms.uBaseColor.value.set(color);},[rainbow,color,uniforms]);
  useFrame(({clock})=>{if(mat.current&&!paused)mat.current.uniforms.uTime.value=clock.elapsedTime;});
  return <points geometry={geo} frustumCulled={false}>
    <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={FALL_VERTEX} fragmentShader={FALL_FRAGMENT} transparent depthWrite={false} blending={THREE.AdditiveBlending}/>
  </points>;
}

function Stage({color,variant,rainbow=true,density=2,paused=false,onLoaded,onError}) {
  const group=useRef(null),dots=useRef(null),halo=useRef(null);
  const cursor=useRef({x:-1,y:-1,active:false});
  const raycaster=useMemo(()=>new THREE.Raycaster(),[]);
  const glowTexture=useMemo(()=>createGlowTexture(),[]);
  const fx=useMemo(()=>({
    time:{value:0},color:{value:new THREE.Color('#476bff')},
    rainbow:{value:1},hover:{value:new THREE.Vector3(0,0,0)},
    strength:{value:0}
  }),[]);
  useEffect(()=>()=>glowTexture?.dispose(),[glowTexture]);
  const [loaded,setLoaded]=useState(null);
  useEffect(()=>{
    let active=true;
    const loader=new GLTFLoader();
    loader.load(MODEL_PATH,(gltf)=>{
      if(!active)return;
      const actualModel=normalizeModel(gltf.scene);
      actualModel.traverse(object=>{
        if(!object.isMesh)return;
        object.castShadow=true;
        object.receiveShadow=true;
        if(object.material){
          object.material=Array.isArray(object.material)?object.material.map(m=>m.clone()):object.material.clone();
          for(const mat of (Array.isArray(object.material)?object.material:[object.material])){
            const identity=(String(object.name)+' '+String(mat.name)).toLowerCase();
            const isFace=/eye|pupil|cornea|mouth|teeth|tongue/.test(identity);
            if(!isFace && (/fur|body|arm|hand|monki/.test(identity) || identity.trim()==='')){
              applyMokraFurMaterial(mat,fx);
            } else {mat.side=THREE.DoubleSide;mat.needsUpdate=true;}
          }
        }
      });
      setLoaded(actualModel);
      onLoaded?.(true);
    },undefined,(error)=>{
      if(active){
        console.error('Unable to load Mokra player model:',error);
        onError?.(true);
      }
    });
    return ()=>{active=false;};
  },[onLoaded,onError,fx]);
  const model=loaded;
  const points=useMemo(()=>model?samplePoints(model,variant==='mini'?4000*density:12000*density):null,[model,variant,density]);
  useEffect(()=>()=>points?.dispose(),[points]);
  const uniforms=useMemo(()=>({
    uTime:{value:0},uBaseColor:{value:new THREE.Color('#476bff')},
    uSpectrum:{value:1},uSize:{value:25},
    uHoverPoint:fx.hover,uHoverStrength:fx.strength
  }),[fx]);
  useEffect(()=>{
    uniforms.uBaseColor.value.set(color||'#476bff');
    uniforms.uSpectrum.value=rainbow?1:0;
    fx.color.value.set(color||'#476bff');
    fx.rainbow.value=rainbow?1:0;
  },[color,rainbow,uniforms,fx]);
  useEffect(()=>{
    if(typeof window==='undefined')return;
    // Only the point under the cursor responds; the character never rotates to follow it.
    const onMove=e=>{cursor.current={x:e.clientX,y:e.clientY,active:true};};
    const onLeave=()=>{cursor.current.active=false;};
    window.addEventListener('pointermove',onMove,{passive:true});
    window.addEventListener('blur',onLeave);
    document.addEventListener('pointerleave',onLeave);
    return ()=>{
      window.removeEventListener('pointermove',onMove);
      window.removeEventListener('blur',onLeave);
      document.removeEventListener('pointerleave',onLeave);
    };
  },[]);
  useFrame(({clock,camera,gl},dt)=>{
    const time=paused?0:clock.elapsedTime;
    fx.time.value=time;
    uniforms.uTime.value=time;
    if(model && cursor.current.active){
      const rect=gl.domElement.getBoundingClientRect();
      const x=(cursor.current.x-rect.left)/rect.width;
      const y=(cursor.current.y-rect.top)/rect.height;
      if(x>=0&&x<=1&&y>=0&&y<=1){
        // Pointer-to-mesh raycast uses the user's actual GLB geometry.
        raycaster.setFromCamera(new THREE.Vector2(x*2-1,1-y*2),camera);
        const hits=raycaster.intersectObject(model,true);
        if(hits.length){
          fx.hover.value.lerp(hits[0].point,Math.min(1,dt*20));
          fx.strength.value=THREE.MathUtils.damp(fx.strength.value,1,11,dt);
        }else{fx.strength.value=THREE.MathUtils.damp(fx.strength.value,0,11,dt);}
      }else{fx.strength.value=THREE.MathUtils.damp(fx.strength.value,0,11,dt);}
    }else{fx.strength.value=THREE.MathUtils.damp(fx.strength.value,0,11,dt);}
    if(halo.current){
      const strength=fx.strength.value;
      halo.current.visible=strength>.015;
      halo.current.position.copy(fx.hover.value);
      halo.current.scale.setScalar(.50+strength*.80);
      halo.current.material.opacity=strength*.75;
      const glowColor=rainbow?new THREE.Color().setHSL((time*.11+fx.hover.value.y*.17)%1,.82,.68):new THREE.Color(color||'#476bff');
      halo.current.material.color.copy(glowColor);
    }
  });
  return <>
    <ambientLight intensity={1.28}/>
    <directionalLight position={[2.3,4.5,5]} intensity={2.4}/>
    <directionalLight position={[-4,1,-3]} color="#335bff" intensity={1.2}/>
    <pointLight position={[0,-1,3]} color="#8f56ff" intensity={.8}/>
    <RainbowRain small={variant==='mini'} paused={paused} rainbow={rainbow} color={color}/>
    <group ref={group} scale={variant==='mini'?.92:1}>
      {model&&<primitive object={model}/>}
      {points&&<points geometry={points} frustumCulled={false}>
        <shaderMaterial ref={dots} uniforms={uniforms} vertexShader={SURFACE_VERTEX} fragmentShader={SURFACE_FRAGMENT} transparent depthWrite={false} blending={THREE.AdditiveBlending}/>
      </points>}
    </group>
    {glowTexture && <sprite ref={halo} visible={false} renderOrder={15}>
      <spriteMaterial map={glowTexture} color="#ffffff" transparent opacity={0} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending}/>
    </sprite>}
  </>;
}

export default function Character({color='#476bff',variant='hero',rainbow=true,density=2}) {
  const [reduced,setReduced]=useState(false);
  const [ready,setReady]=useState(false);
  const [loadError,setLoadError]=useState(false);
  useEffect(()=>{
    const q=window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync=()=>setReduced(q.matches);
    sync();q.addEventListener?.('change',sync);
    return ()=>q.removeEventListener?.('change',sync);
  },[]);
  return <div className={'mk-character mk-character--'+variant} role="img" aria-label="Real Mokra 3D player model with rainbow fur and a magnified luminous glow where you hover">
    <Canvas dpr={[1,1.5]} gl={{alpha:true,antialias:true,powerPreference:'high-performance'}} camera={{position:[0,.18,variant==='mini'?8.7:7.6],fov:39}} frameloop="always">
      <Stage color={color} variant={variant} rainbow={rainbow} density={density} paused={reduced} onLoaded={setReady} onError={setLoadError}/>
    </Canvas>
    {!ready&&!loadError&&<div className="mk-model-loadstate" role="status"><span className="mk-model-loadspinner"/>LOADING REAL MOKRA MODEL</div>}
    {loadError&&<div className="mk-model-loadstate" role="alert">MODEL COULD NOT LOAD · CHECK ASSET PATH</div>}
  </div>;
}
