import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, Color, Vector3, Group, DoubleSide, MeshStandardMaterial } from 'three';
import { useTexture, Float, Text } from '@react-three/drei';
import { useHand } from './HandTracker';

const ORNAMENT_COUNT = 1700;
const PHOTO_COUNT = 30;

const PHOTO_URLS = Array.from({ length: 8 }).map((_, i) => `https://picsum.photos/seed/${i + 123}/200`);

const PhotoContent = ({ id }: { id: number }) => {
  const texture = useTexture(PHOTO_URLS[id % PHOTO_URLS.length]);
  return (
    <mesh position={[0, 0, 0.035]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
};

const PhotoCard = ({ id, treePos, scatterPos, phase }: any) => {
  const meshRef = useRef<Group>(null);
  const frameMatRef = useRef<MeshStandardMaterial>(null);
  const { position: handPose, isOpen } = useHand();
  const persistentRotY = useRef(0);
  const persistentRotX = useRef(0);
  
  const state = useMemo(() => ({
    currentPos: scatterPos.clone(),
    velocity: new Vector3(),
    rotation: new Vector3(Math.random() * Math.PI, Math.random() * Math.PI, 0),
    rotVel: new Vector3((Math.random() - 0.5) * 0.0075, (Math.random() - 0.5) * 0.0075, Math.random() * 0.005),
  }), [scatterPos]);

  useFrame((sceneState) => {
    if (!meshRef.current) return;
    const time = sceneState.clock.getElapsedTime();
    const isGathering = !isOpen;
    
    // Dynamic Scatter Position (Follow Hand Rotation + Dynamic Pulse)
    let dynamicTarget = scatterPos.clone();
    if (isOpen) {
      const radius = 10.5;
      
      // Calculate rotation based on hand position
      if (handPose) {
        const targetRotY = handPose.x * Math.PI * 0.69;
        const targetRotX = -handPose.y * Math.PI * 0.69; // Invert Y for intuitive tilt
        
        persistentRotY.current += (targetRotY - persistentRotY.current) * 0.25;
        persistentRotX.current += (targetRotX - persistentRotX.current) * 0.25;
      }
      
      // Apply rotation to the original scatter position
      // First rotate around Y (vertical axis) for X-hand-movement
      dynamicTarget.applyAxisAngle(new Vector3(0, 1, 0), persistentRotY.current);
      // Then rotate around X (horizontal axis) for Y-hand-movement
      dynamicTarget.applyAxisAngle(new Vector3(1, 0, 0), persistentRotX.current);

      // Subtler pulsing expansion to maintain solid sphere shape
      const pulse = Math.sin(time * 0.3 + phase) * 0.8;
      const surge = Math.pow(Math.max(0, Math.sin(time * 0.5 + phase * 2)), 12) * 2;
      
      // Radiate outward with stabilized depth
      dynamicTarget.normalize().multiplyScalar(radius + pulse + surge);
    }
    
    const target = isGathering ? treePos : dynamicTarget;

    if (handPose) {
      const handVec = new Vector3(handPose.x * 7, handPose.y * 7, handPose.z * 1.5);
      const distToHand = state.currentPos.distanceTo(handVec);
      if (isOpen && distToHand < 6) {
        const force = (6 - distToHand) * 0.02;
        const dir = state.currentPos.clone().sub(handVec).normalize();
        state.velocity.add(dir.multiplyScalar(force));
      }
    }

    if (isGathering) {
      state.currentPos.lerp(target, 0.02); // Adjusted from 0.03 to 0.02
      state.velocity.multiplyScalar(0.7);
      meshRef.current.lookAt(0, state.currentPos.y, 15);
    } else {
      state.currentPos.add(state.velocity);
      state.velocity.multiplyScalar(0.92);
      
      // Follow target position
      state.currentPos.lerp(target, 0.035);
      
      // Crucial: Maintain radial volume to prevent flattening during rotation
      const targetDist = target.length();
      const currentDist = state.currentPos.length();
      // Gently correct radius independently of angle
      const correctedDist = currentDist + (targetDist - currentDist) * 0.12;
      if (currentDist > 0.001) {
        state.currentPos.multiplyScalar(correctedDist / currentDist);
      }

      meshRef.current.rotation.x += state.rotVel.x;
      meshRef.current.rotation.y += state.rotVel.y;
    }

    meshRef.current.position.copy(state.currentPos);
    const targetScale = isGathering ? 0.75 : 1.6;
    meshRef.current.scale.lerp(new Vector3(targetScale, targetScale, targetScale), 0.04);

    if (frameMatRef.current) {
      const pulse = Math.pow(Math.abs(Math.sin(time * Math.PI + phase)), 12);
      frameMatRef.current.emissiveIntensity = 0.4 + pulse * 4.8;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh>
        <boxGeometry args={[1.15, 1.15, 0.06]} />
        <meshStandardMaterial 
          ref={frameMatRef}
          color="#FFD700" 
          emissive="#FF8C00" 
          emissiveIntensity={1} 
          toneMapped={false}
          metalness={1} 
          roughness={0.05} 
        />
      </mesh>
      <React.Suspense fallback={
        <mesh position={[0, 0, 0.035]}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      }>
        <PhotoContent id={id} />
      </React.Suspense>
    </group>
  );
};

const TreeTop = () => {
  const meshRef = useRef<Group>(null);
  const { isOpen } = useHand();

  useFrame((state) => {
    if (!meshRef.current) return;
    const isGathering = !isOpen;
    const time = state.clock.getElapsedTime();
    const targetPos = new Vector3(0, 5.0, 0); 
    const scatterPos = new Vector3(0, 0, 0);
    meshRef.current.position.lerp(isGathering ? targetPos : scatterPos, 0.02);
    meshRef.current.rotation.y += 0.005;
    meshRef.current.scale.lerp(new Vector3().setScalar(isGathering ? 1.5 : 0.01), 0.02);
    
    // Pulse effect for the top triangle
    if (meshRef.current.children[0]) {
      const mat = (meshRef.current.children[0] as any).material;
      mat.emissiveIntensity = 0.8 + Math.sin(time * 2) * 0.4;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh rotation={[0, 0, 0]}>
        <coneGeometry args={[0.7, 1.2, 3]} /> {/* 3-sided cone = Triangle peak */}
        <meshStandardMaterial 
          color="#FFD700" 
          emissive="#FFD700"
          emissiveIntensity={1}
          metalness={1} 
          roughness={0.05} 
        />
      </mesh>
    </group>
  );
};

const MerryChristmasTitle = () => {
  const { isOpen } = useHand();
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <group position={[0, 6.5, 0]}>
        <Text
          color="#ffcc33"
          fontSize={1.4}
          maxWidth={200}
          lineHeight={1}
          letterSpacing={0.15}
          textAlign="center"
          font="https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXDTjYgFE_.woff"
          anchorX="center"
          anchorY="middle"
          visible={!isOpen}
        >
          MERRY CHRISTMAS
          <meshStandardMaterial 
            emissive="#FFD700" 
            emissiveIntensity={1.5} 
            metalness={1} 
            roughness={0.05} 
            toneMapped={false} 
          />
        </Text>
      </group>
    </Float>
  );
};

const VolumetricCore = () => {
  const lightRef = useRef<any>(null);
  const { isOpen } = useHand();

  useFrame((state) => {
    if (!lightRef.current) return;
    const time = state.clock.getElapsedTime();
    lightRef.current.intensity = (isOpen ? 1 : 12) * (0.8 + Math.sin(time * 3) * 0.2);
  });

  return (
    <group>
      <pointLight 
        ref={lightRef} 
        position={[0, 0, 0]} 
        color="#ffaa00" 
        distance={isOpen ? 5 : 12} 
        decay={2} 
      />
      {/* Inner glow sphere */}
      {!isOpen && (
        <mesh>
          <sphereGeometry args={[2, 32, 32]} />
          <meshBasicMaterial 
            color="#ffaa00" 
            transparent 
            opacity={0.05} 
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

export const ChristmasTree = () => {
  const octaRef = useRef<any>(null);
  const sphereRef = useRef<any>(null);
  const { position: handPose, isOpen } = useHand();
  const persistentRotY = useRef(0);
  const persistentRotX = useRef(0);
  const dummy = useMemo(() => new Object3D(), []);

  const data = useMemo(() => {
    const generatePos = (idx: number, total: number) => {
      const h = (idx / total) * 14;
      const r = (14 - h) * 0.55;
      const theta = idx * 0.55;
      const treePos = new Vector3(Math.cos(theta) * r, h - 6.5, Math.sin(theta) * r);
      
      const phi = Math.acos(-1 + (2 * idx) / total);
      const th = Math.sqrt(total * Math.PI) * phi;
      // Uniform volumetric thick shell without Z bias
      const baseRadius = 7.5 + Math.random() * 5.0; 
      const scatterPos = new Vector3(
        Math.cos(th) * Math.sin(phi),
        Math.sin(th) * Math.sin(phi),
        Math.cos(phi)
      ).multiplyScalar(baseRadius);

      return { 
        treePos, 
        scatterPos, 
        phase: idx * 0.1
      };
    };

    const photos = Array.from({ length: PHOTO_COUNT }).map((_, i) => ({
      id: i,
      ...generatePos(i * (ORNAMENT_COUNT / PHOTO_COUNT), ORNAMENT_COUNT),
    }));

    const ornaments = Array.from({ length: ORNAMENT_COUNT }).map((_, i) => {
      const { treePos, scatterPos, phase } = generatePos(i, ORNAMENT_COUNT);
      const rand = Math.random();
      let color = new Color();
      if (rand < 0.3) color.setHSL(0.1, 0.9, 0.5);       // Gold
      else if (rand < 0.55) color.setHSL(0.02, 0.9, 0.4);  // Red
      else if (rand < 0.75) color.setHSL(0.35, 0.8, 0.4);  // Green
      else if (rand < 0.9) color.setHSL(0.6, 0.8, 0.5);   // Blue
      else color.setHSL(0.12, 0.2, 0.9);                   // Warm White

      return {
        currentPos: new Vector3().copy(scatterPos),
        treePos,
        scatterPos,
        velocity: new Vector3(),
        color,
        baseColor: color.clone(),
        phase,
        shape: Math.random() > 0.5 ? 'octa' : 'sphere',
        randomScale: new Vector3(
          1.0 + Math.random() * 0.3,
          1.0 + Math.random() * 0.3,
          1.0 + Math.random() * 0.3
        )
      };
    });

    return { photos, ornaments };
  }, []);

  useFrame((state) => {
    if (!octaRef.current || !sphereRef.current) return;
    const time = state.clock.getElapsedTime();
    const isGathering = !isOpen;

    let octaIdx = 0;
    let sphereIdx = 0;

    data.ornaments.forEach((p) => {
      let dynamicTarget = p.scatterPos.clone();
      if (isOpen) {
        const baseRadius = 10.0;
        
        // Calculate rotation based on hand position
        if (handPose) {
          const targetRotY = handPose.x * Math.PI * 0.69;
          const targetRotX = -handPose.y * Math.PI * 0.69; // Invert Y for intuitive tilt
          
          persistentRotY.current += (targetRotY - persistentRotY.current) * 0.25;
          persistentRotX.current += (targetRotX - persistentRotX.current) * 0.25;
        }
        
        // Apply rotation to the original scatter position
        // Rotate around Y axis for vertical rotation (responding to hand X)
        dynamicTarget.applyAxisAngle(new Vector3(0, 1, 0), persistentRotY.current);
        // Rotate around X axis for horizontal rotation (responding to hand Y)
        dynamicTarget.applyAxisAngle(new Vector3(1, 0, 0), persistentRotX.current);
        
        // Subtler radial motion to preserve spherical volume
        const breath = Math.sin(time * 0.4 + p.phase * 3) * 0.8;
        const burst = Math.pow(Math.max(0, Math.sin(time * 0.3 + p.phase)), 12) * 2.5;
        const currentRadius = baseRadius + breath + burst;
        
        // Radiate along its own scatter normal (Uniform spherical shell)
        dynamicTarget.normalize().multiplyScalar(currentRadius);
      }

      const target = isGathering ? p.treePos : dynamicTarget;
      const currentTarget = target.clone();
      if (isGathering) {
        currentTarget.x += Math.sin(time * 0.5 + p.phase) * 0.08;
        currentTarget.y += Math.cos(time * 0.4 + p.phase) * 0.08;
        currentTarget.z += Math.sin(time * 0.3 + p.phase) * 0.08;
      }
      
      if (isGathering) {
        p.currentPos.lerp(currentTarget, 0.02); // Adjusted from 0.03 to 0.02
        p.velocity.set(0, 0, 0);
      } else {
        p.currentPos.add(p.velocity);
        p.velocity.multiplyScalar(0.93);
        
        // Follow target position
        p.currentPos.lerp(target, 0.035);

        // Crucial: Maintain radial volume to prevent flattening during rotation
        const targetDist = target.length();
        const currentDist = p.currentPos.length();
        // Gently correct radius independently of angle
        const correctedDist = currentDist + (targetDist - currentDist) * 0.12;
        if (currentDist > 0.001) {
          p.currentPos.multiplyScalar(correctedDist / currentDist);
        }
        
        if (handPose) {
          const handVec = new Vector3(handPose.x * 7, handPose.y * 7, handPose.z * 1.5);
          const dist = p.currentPos.distanceTo(handVec);
          if (dist < 4) {
            p.velocity.add(p.currentPos.clone().sub(handVec).normalize().multiplyScalar((4 - dist) * 0.02));
          }
        }
      }

      const shimmer = Math.sin(time * (2 + p.phase % 2) + p.phase * 5) * 0.3 + 0.7;
      // Refined scales: 0.1 for tree, 0.14 for scatter
      const baseScale = (isGathering ? 0.1 : 0.14) * (0.9 + shimmer * 0.2);
      
      // Gentle perspective scaling
      const perspectiveScale = 1 + Math.max(-0.4, (p.currentPos.z + 2) * 0.1);
      const finalScale = baseScale * perspectiveScale;

      dummy.position.copy(p.currentPos);
      dummy.scale.set(
        finalScale * p.randomScale.x,
        finalScale * p.randomScale.y,
        finalScale * p.randomScale.z
      );
      dummy.rotation.set(p.phase, time * 0.2 + p.phase, p.phase * 0.5);
      dummy.updateMatrix();

      const glowColor = p.baseColor.clone();
      glowColor.multiplyScalar(3.0 + shimmer * 3.0); 

      if (p.shape === 'octa') {
        octaRef.current!.setMatrixAt(octaIdx, dummy.matrix);
        octaRef.current!.setColorAt(octaIdx, glowColor);
        octaIdx++;
      } else {
        sphereRef.current!.setMatrixAt(sphereIdx, dummy.matrix);
        sphereRef.current!.setColorAt(sphereIdx, glowColor);
        sphereIdx++;
      }
    });

    octaRef.current.instanceMatrix.needsUpdate = true;
    if (octaRef.current.instanceColor) octaRef.current.instanceColor.needsUpdate = true;
    
    sphereRef.current.instanceMatrix.needsUpdate = true;
    if (sphereRef.current.instanceColor) sphereRef.current.instanceColor.needsUpdate = true;
  });

  const octaCount = data.ornaments.filter(p => p.shape === 'octa').length;
  const sphereCount = ORNAMENT_COUNT - octaCount;

  return (
    <>
      <TreeTop />
      <VolumetricCore />
      <group>
        {data.photos.map((p) => (
          <PhotoCard key={p.id} {...p} />
        ))}
      </group>
      <instancedMesh ref={octaRef} args={[null as any, null as any, octaCount]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial metalness={0.1} roughness={0.5} emissiveIntensity={2} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={sphereRef} args={[null as any, null as any, sphereCount]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial metalness={0.1} roughness={0.5} emissiveIntensity={2} toneMapped={false} />
      </instancedMesh>
    </>
  );
};
