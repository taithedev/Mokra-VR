'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

// A completely original, procedural point-cloud Mokra mascot. No exported game meshes.
function seededRandom(initial = 794) {
  let seed = initial;
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function makeCloud(baseColor) {
  const random = seededRandom(83023);
  const points = [];
  const colors = [];
  const fur = new THREE.Color(baseColor);
  const pearl = new THREE.Color('#f0f0f8');
  const cobalt = new THREE.Color('#94b6ff');
  const add = (x, y, z, tone = 'fur') => {
    const base = tone === 'pearl' ? pearl : tone === 'shadow' ? cobalt : fur;
    const alternate = tone === 'fur' ? cobalt : pearl;
    const color = base.clone().lerp(alternate, random() * (tone === 'fur' ? 0.47 : 0.24));
    const exposure = 0.4 + random() * 0.82;
    color.multiplyScalar(exposure);
    points.push(x, y, z);
    colors.push(color.r, color.g, color.b);
  };
  const ellipsoid = ({ x, y, z, sx, sy, sz, count, tone = 'fur', angle = 0, face = false }) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let i = 0; i < count; i++) {
      const yy = random() * 2 - 1;
      const a = random() * Math.PI * 2;
      const rad = Math.sqrt(Math.max(0, 1 - yy * yy));
      const dx = rad * Math.cos(a) * sx;
      const dz = rad * Math.sin(a) * sz;
      if (face && dz < 0) continue;
      const jitter = (random() - .5) * .032;
      add(x + dx * cos - yy * sy * sin + jitter, y + dx * sin + yy * sy * cos + jitter, z + dz + jitter, tone);
    }
  };
  // Rounded head, heavy chest, very long climbing arms and the distinctive small Mokra ears.
  ellipsoid({ x: 0, y: .96, z: -.02, sx: .77, sy: .72, sz: .59, count: 10000 });
  ellipsoid({ x: 0, y: -.43, z: -.06, sx: .77, sy: 1.16, sz: .59, count: 13500 });
  ellipsoid({ x: -.75, y: 1.18, z: -.02, sx: .28, sy: .37, sz: .26, count: 1300 });
  ellipsoid({ x: .75, y: 1.18, z: -.02, sx: .28, sy: .37, sz: .26, count: 1300 });
  ellipsoid({ x: -.75, y: 1.18, z: .22, sx: .16, sy: .24, sz: .07, count: 600, tone: 'pearl' });
  ellipsoid({ x: .75, y: 1.18, z: .22, sx: .16, sy: .24, sz: .07, count: 600, tone: 'pearl' });
  ellipsoid({ x: -.94, y: -.88, z: -.04, sx: .3, sy: 1.11, sz: .35, count: 6800, angle: -.21 });
  ellipsoid({ x: .94, y: -.88, z: -.04, sx: .3, sy: 1.11, sz: .35, count: 6800, angle: .21 });
  ellipsoid({ x: -1.19, y: -1.79, z: .05, sx: .38, sy: .4, sz: .29, count: 1700 });
  ellipsoid({ x: 1.19, y: -1.79, z: .05, sx: .38, sy: .4, sz: .29, count: 1700 });
  [-.22, -.07, .08, .23].forEach(dx => {
    ellipsoid({ x: -1.2 + dx, y: -2.08, z: .14, sx: .085, sy: .27, sz: .1, count: 350 });
    ellipsoid({ x: 1.2 + dx, y: -2.08, z: .14, sx: .085, sy: .27, sz: .1, count: 350 });
  });
  // The chest and muzzle are translucent-looking clusters of pale points.
  ellipsoid({ x: 0, y: -.45, z: .54, sx: .47, sy: .78, sz: .065, count: 6600, tone: 'pearl', face: true });
  ellipsoid({ x: 0, y: .87, z: .57, sx: .59, sy: .43, sz: .08, count: 6400, tone: 'pearl', face: true });
  ellipsoid({ x: 0, y: .61, z: .65, sx: .30, sy: .18, sz: .08, count: 850, tone: 'pearl', face: true });
  // Faint surface fragments for the particles-through-the-dark visual language.
  for (let i = 0; i < 1700; i++) {
    const a = random() * Math.PI * 2;
    const radius = 1.25 + random() * 1.65;
    const height = (random() - .5) * 4.5;
    add(Math.cos(a) * radius, height, Math.sin(a) * .7 - .65, random() > .55 ? 'shadow' : 'fur');
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

function Eyes() {
  const eyes = useRef();
  const shared = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const handler = event => {
      shared.current.x = (event.clientX / window.innerWidth - .5) * 2;
      shared.current.y = (event.clientY / window.innerHeight - .5) * 2;
    };
    window.addEventListener('pointermove', handler, { passive: true });
    return () => window.removeEventListener('pointermove', handler);
  }, []);
  useFrame((_, delta) => {
    if (!eyes.current) return;
    eyes.current.position.x = THREE.MathUtils.damp(eyes.current.position.x, shared.current.x * .055, 4, delta);
    eyes.current.position.y = THREE.MathUtils.damp(eyes.current.position.y, -shared.current.y * .048, 4, delta);
  });
  return <group ref={eyes}>
    {[-.265, .265].map(x => <group key={x} position={[x, 1.02, .655]}>
      <mesh scale={[.17,.225,.045]}><sphereGeometry args={[1, 20, 12]}/><meshBasicMaterial color="#050710"/></mesh>
      <mesh position={[x < 0 ? -.04 : .04,.055,.048]} scale={[.043,.062,.018]}><sphereGeometry args={[1, 14, 10]}/><meshBasicMaterial color="#edf5ff"/></mesh>
    </group>)}
    <mesh position={[0,.69,.677]} scale={[.1,.065,.028]}><sphereGeometry args={[1,16,12]}/><meshBasicMaterial color="#090b17"/></mesh>
  </group>;
}

function Creature({ color, variant }) {
  const group = useRef();
  const mouse = useRef({ x: 0, y: 0 });
  const geometry = useMemo(() => makeCloud(color), [color]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    const handler = event => {
      mouse.current.x = (event.clientX / window.innerWidth - .5) * 2;
      mouse.current.y = (event.clientY / window.innerHeight - .5) * 2;
    };
    window.addEventListener('pointermove', handler, { passive: true });
    return () => window.removeEventListener('pointermove', handler);
  }, []);
  useFrame(({ clock }, delta) => {
    const element = group.current;
    if (!element) return;
    const t = clock.elapsedTime;
    element.rotation.y = THREE.MathUtils.damp(element.rotation.y, mouse.current.x * .34, 2.6, delta);
    element.rotation.x = THREE.MathUtils.damp(element.rotation.x, -mouse.current.y * .09, 2.6, delta);
    element.rotation.z = Math.sin(t * .72) * .012;
    element.position.y = Math.sin(t * 1.18) * .055 + (variant === 'portrait' ? -.05 : 0);
  });
  return <group ref={group} scale={variant === 'mini' ? .82 : 1}>
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={.0165} vertexColors sizeAttenuation transparent opacity={.96} depthWrite={false}/>
    </points>
    <Eyes/>
  </group>;
}

export default function Character({ color = '#416cff', variant = 'hero' }) {
  return <div className={`mk-character mk-character--${variant}`} role="img" aria-label="Original blue point-cloud Mokra creature; its head tracks your mouse cursor">
    <Canvas dpr={[1, 1.65]} gl={{ alpha:true, antialias:false, powerPreference:'high-performance' }} camera={{position:[0, .02, variant === 'mini' ? 7.3 : 6.3], fov:42}}>
      <Creature color={color} variant={variant}/>
    </Canvas>
  </div>;
}
