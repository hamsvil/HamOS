 
// @ts-nocheck
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext';
import { ErrorBoundary } from './ErrorBoundary';

function HamParticles({ isDark }: { isDark: boolean }) {
  const points = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.05;
      points.current.rotation.x = state.clock.elapsedTime * 0.02;
    }
  });

  const particlesCount = 1000;
  const positions = useMemo(() => {
    const pos = new Float32Array(particlesCount * 3);
    const randomValues = new Uint32Array(particlesCount * 3);
    const cryptoObj = typeof window !== 'undefined' ? (window.crypto || (window as any).msCrypto) : null;
    if (cryptoObj) {
      cryptoObj.getRandomValues(randomValues);
    } else {
      for (let i = 0; i < randomValues.length; i++) randomValues[i] = Math.floor(Math.random() * 0xffffffff);
    }
    for (let i = 0; i < particlesCount * 3; i++) {
      pos[i] = (randomValues[i] / (0xffffffff + 1) - 0.5) * 20;
    }
    return pos;
  }, []);

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.02} 
        color={isDark ? "#00ffcc" : "#008877"} 
        transparent 
        opacity={isDark ? 0.6 : 0.3} 
        blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending} 
      />
    </points>
  );
}

export default function HamBackground() {
  const { theme } = useTheme();
  const isDark = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch (e) {
        return true;
      }
    }
    return true;
  }, [theme]);

  return (
    <div className="fixed inset-0 z-[-1] bg-[var(--bg-primary)] transition-colors duration-500">
      <ErrorBoundary fallback={<div className="absolute inset-0 bg-[var(--bg-primary)]" />}>
        <Canvas camera={{ position: [0, 0, 5] }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
          <ambientLight intensity={isDark ? 0.5 : 1.0} />
          {isDark && <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />}
          <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
            <HamParticles isDark={isDark} />
          </Float>
        </Canvas>
      </ErrorBoundary>
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${isDark ? 'bg-gradient-to-b from-transparent via-[var(--bg-primary)]/50 to-[var(--bg-primary)] opacity-100' : 'bg-white/10 opacity-50'}`} />
    </div>
  );
}
