 
// @ts-nocheck
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { ErrorBoundary } from './ErrorBoundary';

const LogoH = () => {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.getElapsedTime() * 0.2;
    }
  });

  return (
    <group ref={group}>
        <mesh position={[-0.7, 0, 0]}>
            <boxGeometry args={[0.3, 2.5, 0.3]} />
            <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={3} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0.7, 0, 0]}>
            <boxGeometry args={[0.3, 2.5, 0.3]} />
            <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={3} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.7, 0.3, 0.3]} />
            <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={3} metalness={0.9} roughness={0.1} />
        </mesh>
    </group>
  );
};

interface SplashScreenProps {
  progress: number;
  status: string;
  onForceStart?: () => void;
}

export default function SplashScreen({ progress, status, onForceStart }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 bg-[var(--bg-primary)] z-[100] flex flex-col items-center justify-center text-[var(--text-primary)] font-sans">
      <div className="w-64 h-64">
        <ErrorBoundary fallback={<div className="w-full h-full flex items-center justify-center border border-[#00ffcc]/20 rounded-lg font-mono text-[10px] text-[#00ffcc]/40">3D LOGO OFFLINE</div>}>
          <Canvas camera={{ position: [0, 0, 5] }} gl={{ antialias: false }}>
            <ambientLight intensity={1.5} />
            <pointLight position={[10, 10, 10]} intensity={200} color="#00ffcc" />
            <pointLight position={[-10, -10, -10]} intensity={100} color="#ffffff" />
            <LogoH />
            <Sparkles count={100} scale={3} size={2} speed={0.5} color="#00ffcc" />
          </Canvas>
        </ErrorBoundary>
      </div>
      <h1 className="text-4xl font-bold tracking-[0.2em] mt-4 animate-pulse text-shadow-glow">HAM OS</h1>
      <p className="text-md text-[var(--text-secondary)]">Version 1</p>
      <p className="text-xs text-[var(--text-secondary)]/60 mt-12">Created By Hamli</p>
      
      <div className="w-72 mt-4 flex flex-col items-center">
        <p className="text-xs text-[#00ffcc] mb-2 font-mono text-center h-4">{status}</p>
        <div className="w-full h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden border border-[var(--border-color)]">
          <div
            className="h-full bg-gradient-to-r from-[#00ffcc] to-blue-500 shadow-[0_0_10px_#00ffcc] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {onForceStart && (
          <button 
            onClick={onForceStart}
            className="mt-6 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all animate-bounce"
          >
            Force Start System
          </button>
        )}
      </div>
       <style>{`
        .text-shadow-glow {
          text-shadow: 0 0 8px rgba(0, 255, 204, 0.5), 0 0 20px rgba(0, 255, 204, 0.3);
        }
      `}</style>
    </div>
  );
}
