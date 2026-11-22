'use client';
import {Canvas,useFrame} from '@react-three/fiber';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
function Part({color,position,scale,rotation,children}){return <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow><sphereGeometry args={[1,24,16]}/><meshStandardMaterial color={color} roughness={0.82}/>{children}</mesh>}
function Creature({color}){
 const body=useRef(),head=useRef(),pupils=useRef(),left=useRef(),right=useRef(),pointer=useRef({x:0,y:0});
 const [excited,setExcited]=useState(false);
 useEffect(()=>{
   const track=e=>{pointer.current={x:(e.clientX/window.innerWidth-.5)*2,y:(e.clientY/window.innerHeight-.5)*2}};
   window.addEventListener('pointermove',track,{passive:true});
   return ()=>window.removeEventListener('pointermove',track);
 },[]);
 useFrame(({clock},delta)=>{
   const t=clock.elapsedTime;
   if(body.current){body.current.rotation.y=THREE.MathUtils.damp(body.current.rotation.y,-pointer.current.x*.35,3,delta);body.current.rotation.z=THREE.MathUtils.damp(body.current.rotation.z,-pointer.current.x*.07,3,delta);body.current.position.y=Math.sin(t*1.6)*.055;}
   if(head.current){head.current.rotation.y=THREE.MathUtils.damp(head.current.rotation.y,-pointer.current.x*.3,4,delta);head.current.rotation.x=THREE.MathUtils.damp(head.current.rotation.x,-pointer.current.y*.14,4,delta);}
   if(pupils.current){pupils.current.position.x=THREE.MathUtils.damp(pupils.current.position.x,pointer.current.x*.05,6,delta);pupils.current.position.y=THREE.MathUtils.damp(pupils.current.position.y,-pointer.current.y*.035,6,delta);}
   if(left.current)left.current.rotation.z=-.12+Math.sin(t*2)*.04;
   if(right.current)right.current.rotation.z=.12+Math.sin(t*(excited?6:2))*(excited?.23:.04);
 });
 const fur=color||'#d1ef7c',dark='#182526',light='#ddcfad',inner='#90a17b';
 return <group ref={body} scale={1.07} position={[0,-.1,0]} onPointerOver={()=>setExcited(true)} onPointerOut={()=>setExcited(false)}>
   <Part position={[0,-.8,0]} scale={[.88,1,.71]} color={fur}/>
   <Part position={[0,-.82,.57]} scale={[.52,.65,.15]} color={inner}/>
   <Part position={[0,-1.64,0]} scale={[.8,.28,.61]} color={fur}/>
   <group ref={left} position={[-1,-.52,0]}>
     <Part position={[-.18,-.4,.02]} scale={[.39,.77,.41]} rotation={[0,0,-.16]} color={fur}/>
     <Part position={[-.36,-1.08,.2]} scale={[.4,.72,.42]} color={fur}/>
     <Part position={[-.45,-1.67,.3]} scale={[.46,.33,.46]} color={dark}/>
   </group>
   <group ref={right} position={[1,-.52,0]}>
     <Part position={[.18,-.4,.02]} scale={[.39,.77,.41]} rotation={[0,0,.16]} color={fur}/>
     <Part position={[.36,-1.08,.2]} scale={[.4,.72,.42]} color={fur}/>
     <Part position={[.45,-1.67,.3]} scale={[.46,.33,.46]} color={dark}/>
   </group>
   <Part position={[-.92,1.12,.02]} scale={[.29,.35,.2]} color={fur}/>
   <Part position={[.92,1.12,.02]} scale={[.29,.35,.2]} color={fur}/>
   <Part position={[-.94,1.13,.17]} scale={[.15,.2,.06]} color={inner}/>
   <Part position={[.94,1.13,.17]} scale={[.15,.2,.06]} color={inner}/>
   <group ref={head} position={[0,.54,.2]}>
     <Part position={[0,.32,0]} scale={[1.02,.89,.86]} color={fur}/>
     <Part position={[0,.06,.72]} scale={[.74,.57,.3]} color={light}/>
     <Part position={[0,-.22,.9]} scale={[.41,.25,.2]} color={light}/>
     <Part position={[0,-.05,1.09]} scale={[.19,.11,.11]} color={dark}/>
     <Part position={[0,-.38,.97]} scale={[.27,.05,.05]} color={dark}/>
     <Part position={[-.39,.46,.73]} scale={[.24,.27,.13]} color={dark}/>
     <Part position={[.39,.46,.73]} scale={[.24,.27,.13]} color={dark}/>
     <Part position={[-.39,.46,.84]} scale={[.17,.18,.08]} color="#f8faef"/>
     <Part position={[.39,.46,.84]} scale={[.17,.18,.08]} color="#f8faef"/>
     <group ref={pupils}>
       <Part position={[-.39,.46,.92]} scale={[.075,.095,.04]} color={dark}/>
       <Part position={[.39,.46,.92]} scale={[.075,.095,.04]} color={dark}/>
     </group>
     <mesh position={[0,.88,.7]} rotation={[0,0,Math.PI/4]}><octahedronGeometry args={[.16,0]}/><meshStandardMaterial color="#eeffa1" emissive="#a0d45c" emissiveIntensity={.65}/></mesh>
   </group>
 </group>
}
export default function Character({color}){
 return <div className="character-stage" role="img" aria-label="Interactive original Mokra character that follows cursor movements">
 <Canvas camera={{position:[0,.15,7.1],fov:39}} shadows dpr={[1,1.75]} gl={{alpha:true,antialias:true}}>
 <ambientLight intensity={1.55}/><hemisphereLight args={['#e3fae4','#293b37',1.1]}/>
 <directionalLight castShadow position={[-3,6,5]} intensity={2} color="#fff5df"/>
 <pointLight position={[3,2,-2]} intensity={20} distance={10} color="#d3fa73"/>
 <Creature color={color}/>
 </Canvas></div>
}
