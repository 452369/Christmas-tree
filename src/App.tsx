/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { HandProvider, useHand } from './HandTracker';
import { ChristmasTree } from './Tree';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Hand, MousePointer2 } from 'lucide-react';

function UI() {
  const { isTracking, isOpen } = useHand();

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-8 z-10">
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center"
      >
        <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-emerald-400 to-red-400 drop-shadow-lg font-serif italic">
          Merry Christmas
        </h1>
        <p className="text-emerald-100/60 mt-2 tracking-widest uppercase text-sm">
          Interactive Particle Experience
        </p>
      </motion.div>

      <div className="flex flex-col items-center gap-4" />

      <div className="w-full flex justify-between items-end opacity-40 text-xs text-white/50 border-t border-white/10 pt-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3" />
          <span>3,000 Dynamic Particles</span>
        </div>
        <div className="flex items-center gap-2">
          <MousePointer2 className="w-3 h-3" />
          <span>DRAG TO ROTATE & SCROLL TO ZOOM</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="w-full h-screen bg-[#050b0a] overflow-hidden relative">
      <HandProvider>
        <Canvas 
          camera={{ position: [0, 0, 15], fov: 45 }}
          shadows
          gl={{ antialias: true }}
        >
          <color attach="background" args={['#020504']} />
          <fog attach="fog" args={['#020504', 10, 35]} />
          
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 15, 10]} intensity={3} color="#fff4d6" />
          <pointLight position={[-10, 5, -5]} intensity={2} color="#ffd700" />
          <pointLight position={[0, -2, 0]} intensity={6} color="#ffaa00" distance={15} decay={2} />

          <ChristmasTree />
          
          <Stars radius={100} depth={50} count={6000} factor={4} saturation={0} fade speed={1} />
          
          <EffectComposer>
            <Bloom 
              luminanceThreshold={0.5} 
              mipmapBlur 
              intensity={3.8} 
              radius={0.7}
            />
          </EffectComposer>

          <OrbitControls 
            enablePan={false} 
            minDistance={5} 
            maxDistance={25}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Canvas>
        
        <UI />
      </HandProvider>
      
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none delay-1000" />
    </div>
  );
}
