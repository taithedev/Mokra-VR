'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

const MODEL_PATH = '/models/mokra-player.glb';
// The actual Mokra GLB is an invisible raycast surface. Its sampled points are the visible character.
const SURFACE_VERTEX = `
  attribute float aRandom;
  attribute float aFeature;
  attribute vec3 aNormal;
  uniform float uTime;
  uniform float uDotSize;
  uniform float uHoverStrength;
  uniform vec3 uHoverPoint;
  varying float vHue;
  varying float vHover;
  varying float vFeature;
  varying float vSparkle;
  varying float vShade;
  void main() {
    vec3 p = position;
    vec3 wp = (modelMatrix * vec4(p, 1.0)).xyz;
    float proximity = exp(-pow(distance(wp,uHoverPoint)/.46,2.0));
    vHover = uHoverStrength * proximity;
    p += normalize(aNormal) * (.065 * vHover);
    p.x += .003 * sin(uTime*1.9+aRandom*77.0);
    p.y += .003 * cos(uTime*1.5+aRandom*49.0);
    vHue = fract(.18 * wp.y + .11 * uTime);
    vFeature = aFeature;
    vec3 n = normalize(normalMatrix * aNormal);
    vShade = .20 + .80 * max(0.0,dot(n,normalize(vec3(-.35,.65,1.0))));
    vSparkle = .78 + .22 * sin(uTime*2.8 + aRandom*39.0);
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_Position=projectionMatrix*mv;
    float scale = vFeature>0.5 ? .84 : 1.0;
    gl_PointSize=clamp(uDotSize*scale/max(-mv.z,1.0)*(1.0+1.4*vHover),0.8,7.0);
  }
`;
const SURFACE_FRAGMENT = `
  uniform vec3 uBaseColor;
  uniform float uSpectrum;
  varying float vHue;
  varying float vHover;
  varying float vFeature;
  varying float vSparkle;
  varying float vShade;
  vec3 spectrum(float h){
    return .19 + .81 * clamp(abs(fract(h+vec3(0.,.666667,.333333))*6.-3.)-1.,0.,1.);
  }
  void main(){
    float radius=length(gl_PointCoord-vec2(.5));
    if(radius>.5)discard;
    float core=1.0-smoothstep(.08,.32,radius);
    float halo=1.0-smoothstep(.18,.5,radius);
    vec3 color=mix(uBaseColor,spectrum(vHue),uSpectrum);
    color *= vShade;
    // Eyes and mouth are sampled from the user's real mesh, so their features remain legible.
    if(vFeature>.5&&vFeature<1.5)color=vec3(.09);
    if(vFeature>1.5)color=vec3(.24);
    color=mix(color,vec3(1.),min(.8,vHover*.8));
    float a=(core*.82+halo*.24)*vSparkle;
    a*=1.0+vHover*.30;
    gl_FragColor=vec4(color*(1.20+vHover*.65),min(a,1.0));
  }
`;

function createGlowTexture(){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  const g=ctx.createRadialGradient(64,64,2,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,.96)');
  g.addColorStop(.15,'rgba(255,255,255,.72)');
  g.addColorStop(.42,'rgba(255,255,255,.2)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
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

function samplePoints(source,count=40000) {
  source.updateMatrixWorld(true);
  const parts=[];
  let total=0;
  source.traverse(obj=>{
    if(!obj.isMesh || !obj.geometry?.attributes?.position)return;
    let sampler;
    try{sampler=new MeshSurfaceSampler(obj).build();}catch{return;}
    const feature=obj.userData.mokraFeature||0;
    const bounds=new THREE.Box3().setFromObject(obj);
    const size=new THREE.Vector3();bounds.getSize(size);
    const area=Math.max(.003,(size.x*size.y+size.y*size.z+size.z*size.x));
    const weighted=area*(feature===1?5:feature===2?6:1);
    total+=weighted;
    parts.push({obj,sampler,feature,cutoff:total});
  });
  if(!parts.length)return null;
  const rnd=randomSeed(15110);
  const position=new Float32Array(count*3);
  const normal=new Float32Array(count*3);
  const seed=new Float32Array(count);
  const feature=new Float32Array(count);
  const point=new THREE.Vector3(),surfaceNormal=new THREE.Vector3();
  const normalMatrix=new THREE.Matrix3();
  for(let i=0;i<count;i++){
    const target=rnd()*total;
    // Binary search across cumulative surface area to keep large models efficient.
    let lo=0,hi=parts.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(parts[mid].cutoff<target)lo=mid+1;else hi=mid;}
    const part=parts[lo];
    part.sampler.sample(point,surfaceNormal);
    normalMatrix.getNormalMatrix(part.obj.matrixWorld);
    surfaceNormal.applyMatrix3(normalMatrix).normalize();
    point.applyMatrix4(part.obj.matrixWorld);
    point.addScaledVector(surfaceNormal,.009);
    const index=i*3;
    position[index]=point.x;position[index+1]=point.y;position[index+2]=point.z;
    normal[index]=surfaceNormal.x;normal[index+1]=surfaceNormal.y;normal[index+2]=surfaceNormal.z;
    feature[i]=part.feature;
    seed[i]=rnd();
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(position,3));
  geo.setAttribute('aNormal',new THREE.BufferAttribute(normal,3));
  geo.setAttribute('aRandom',new THREE.BufferAttribute(seed,1));
  geo.setAttribute('aFeature',new THREE.BufferAttribute(feature,1));
  geo.computeBoundingSphere();
  return geo;
}

function TalkingMouth({anchor,speaking,paused}){
  const mouth=useRef(null);
  const opening=useRef(0);
  const geometry=useMemo(()=>{
    const count=240,positions=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const angle=(i/count)*Math.PI*2;
      const radius=1+(i%3)*.027;
      positions[i*3]=Math.cos(angle)*radius;
      positions[i*3+1]=Math.sin(angle)*radius;
      positions[i*3+2]=0;
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(positions,3));
    return g;
  },[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(({clock},dt)=>{
    if(!mouth.current)return;
    const t=clock.elapsedTime;
    const target=speaking ? (paused?.7:(.55+.45*Math.abs(Math.sin(t*11.8)))) : 0;
    opening.current=THREE.MathUtils.damp(opening.current,target,14,dt);
    mouth.current.visible=opening.current>.025;
    mouth.current.scale.set(.13,.008+.16*opening.current,1);
  });
  return <points ref={mouth} geometry={geometry} position={anchor} visible={false} renderOrder={7}>
    <pointsMaterial color="#eeeeee" size={.042} sizeAttenuation transparent opacity={.95} depthWrite={false} blending={THREE.AdditiveBlending}/>
  </points>;
}

function Stage({color,variant,rainbow=true,density=2,speaking=false,paused=false,onLoaded,onError}) {
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
  const [mouthAnchor,setMouthAnchor]=useState([0,.52,.64]);
  useEffect(()=>{
    let active=true;
    const loader=new GLTFLoader();
    loader.load(MODEL_PATH,(gltf)=>{
      if(!active)return;
      const actualModel=normalizeModel(gltf.scene);
      let mouthBounds=null;
      actualModel.traverse(object=>{
        if(!object.isMesh)return;
        const materialName=Array.isArray(object.material)
          ?object.material.map(m=>m.name).join(' ')
          :String(object.material?.name||'');
        const identity=(String(object.name)+' '+materialName).toLowerCase();
        const feature=/mouth|teeth|tongue/.test(identity)?2:/eye|pupil|cornea/.test(identity)?1:0;
        object.userData.mokraFeature=feature;
        if(feature===2){
          const box=new THREE.Box3().setFromObject(object);
          if(!box.isEmpty()){
            if(!mouthBounds)mouthBounds=box;
            else mouthBounds.union(box);
          }
        }
        // Hide the original triangles in the color/depth buffers, but retain their
        // exact geometry for raycasting and surface-sampling. No copied/ripped GILLA mesh.
        object.renderOrder=-10;
        object.castShadow=false;
        object.receiveShadow=false;
        object.material=new THREE.MeshBasicMaterial({
          colorWrite:false,depthWrite:true,side:THREE.FrontSide
        });
      });
      if(mouthBounds){
        const middle=mouthBounds.getCenter(new THREE.Vector3());
        setMouthAnchor([middle.x,middle.y,mouthBounds.max.z+.020]);
      }
      setLoaded(actualModel);
      onLoaded?.(true);
    },undefined,(error)=>{
      if(active){
        console.error('Unable to load Mokra player model:',error);
        onError?.(true);
      }
    });
    return ()=>{active=false;};
  },[onLoaded,onError]);
  const model=loaded;
  const points=useMemo(()=>model?samplePoints(model,
    (variant==='assistant'?7200:variant==='mini'?12000:variant==='portrait'?21000:26000)*density
  ):null,[model,variant,density]);
  useEffect(()=>()=>points?.dispose(),[points]);
  const uniforms=useMemo(()=>({
    uTime:{value:0},uBaseColor:{value:new THREE.Color('#476bff')},
    uSpectrum:{value:1},uDotSize:{value:15},
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
  useFrame(({clock,camera,gl,size},dt)=>{
    // Keep the complete long-armed Monki in frame even inside a narrow chat avatar.
    if(camera.isPerspectiveCamera && size.width>0 && size.height>0){
      const aspect=size.width/size.height;
      const fitWidth=5.85/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.max(.38,aspect));
      const desiredDistance=variant==='assistant'?4.9:Math.max(8.2,fitWidth*1.09);
      camera.position.z=THREE.MathUtils.damp(camera.position.z,desiredDistance,6,dt);
      camera.position.y=THREE.MathUtils.damp(camera.position.y,variant==='assistant'?.52:0,6,dt);
      camera.lookAt(0,variant==='assistant'?.52:0,0);
    }
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
      <group ref={group} scale={variant==='mini'?.92:1}>
      {model&&<primitive object={model}/>}
      {model&&variant==='assistant'&&<TalkingMouth anchor={mouthAnchor} speaking={speaking} paused={paused}/>}
      {points&&<points geometry={points} frustumCulled={false}>
        <shaderMaterial ref={dots} uniforms={uniforms} vertexShader={SURFACE_VERTEX} fragmentShader={SURFACE_FRAGMENT} transparent depthWrite={true} blending={THREE.NormalBlending}/>
      </points>}
    </group>
    {glowTexture && <sprite ref={halo} visible={false} renderOrder={15}>
      <spriteMaterial map={glowTexture} color="#ffffff" transparent opacity={0} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending}/>
    </sprite>}
  </>;
}

export default function Character({color='#eeeeee',variant='hero',rainbow=false,density=2,speaking=false}) {
  const [reduced,setReduced]=useState(false);
  const [ready,setReady]=useState(false);
  const [loadError,setLoadError]=useState(false);
  useEffect(()=>{
    const q=window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync=()=>setReduced(q.matches);
    sync();q.addEventListener?.('change',sync);
    return ()=>q.removeEventListener?.('change',sync);
  },[]);
  return <div className={'mk-character mk-character--'+variant} role="img" aria-label="The real Mokra Monki player model rendered entirely as thousands of shaded surface particles with cursor hover effects">
    <Canvas dpr={variant==='assistant'?[1,1.25]:[1,1.5]} gl={{alpha:true,antialias:true,powerPreference:'high-performance'}} camera={{position:[0,.18,8.8],fov:39}} frameloop="always">
      <Stage color={color} variant={variant} rainbow={rainbow} density={density} speaking={speaking} paused={reduced} onLoaded={setReady} onError={setLoadError}/>
    </Canvas>
    {!ready&&!loadError&&<div className="mk-model-loadstate" role="status"><span className="mk-model-loadspinner"/>LOADING REAL MOKRA MODEL</div>}
    {loadError&&<div className="mk-model-loadstate" role="alert">MODEL COULD NOT LOAD · CHECK ASSET PATH</div>}
  </div>;
}
