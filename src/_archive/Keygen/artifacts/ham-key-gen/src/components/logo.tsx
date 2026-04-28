import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Float } from '@react-three/drei';

function HShape() {
  const mesh = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      mesh.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={mesh} position={[0, 0, 0]}>
      <mesh position={[-0.6, 0, 0]}>
        <boxGeometry args={[0.3, 2, 0.4]} />
        <meshStandardMaterial color="#0055ff" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.6, 0, 0]}>
        <boxGeometry args={[0.3, 2, 0.4]} />
        <meshStandardMaterial color="#0055ff" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 0.3, 0.4]} />
        <meshStandardMaterial color="#3377ff" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!ctx;
  } catch {
    return false;
  }
}

function LogoFallback({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0055ff 0%, #3377ff 100%)',
        borderRadius: 6,
        boxShadow: '0 0 12px rgba(0,191,255,0.5)',
      }}
    >
      <span
        style={{
          color: '#fff',
          fontWeight: 900,
          fontSize: 22,
          fontFamily: 'Orbitron, sans-serif',
          letterSpacing: '-1px',
          textShadow: '0 0 8px rgba(0,191,255,0.8)',
        }}
      >
        H
      </span>
    </div>
  );
}

export function Logo3D({ className }: { className?: string }) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);

  useEffect(() => {
    setHasWebGL(detectWebGL());
  }, []);

  if (hasWebGL === null) {
    return <div className={className} style={{ width: 40, height: 40 }} />;
  }

  if (!hasWebGL) {
    return <LogoFallback className={className} />;
  }

  return (
    <div className={className} style={{ width: 40, height: 40 }}>
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }} gl={{ failIfMajorPerformanceCaveat: false }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
          <HShape />
        </Float>
      </Canvas>
    </div>
  );
}
