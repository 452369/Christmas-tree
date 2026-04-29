import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Hand } from 'lucide-react';

interface HandState {
  isOpen: boolean;
  position: { x: number; y: number; z: number } | null;
  isTracking: boolean;
}

const HandContext = createContext<HandState>({
  isOpen: true,
  position: null,
  isTracking: false,
});

export const useHand = () => useContext(HandContext);

export const HandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handState, setHandState] = useState<HandState>({
    isOpen: true,
    position: null,
    isTracking: false,
  });

  const [trackingStarted, setTrackingStarted] = useState(false);

  return (
    <HandContext.Provider value={handState}>
      {children}
      {trackingStarted ? (
        <HandTrackerInternal onUpdate={setHandState} />
      ) : (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-black/80 border border-white/20 p-8 rounded-3xl text-center max-w-sm"
          >
            <Hand className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Enable Hand Control</h2>
            <p className="text-gray-400 mb-8 text-sm">
              This experience uses your camera to track hand gestures. Please allow camera access when prompted.
            </p>
            <button 
              onClick={() => setTrackingStarted(true)}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95"
            >
              Start Experience
            </button>
            <p className="mt-4 text-[10px] text-gray-500 uppercase tracking-widest">
              No video is ever recorded or sent to any server
            </p>
          </motion.div>
        </div>
      )}
    </HandContext.Provider>
  );
};

// Internal component to handle the actual MediaPipe logic
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

// Fix for Mediapipe aborted error in certain environments (Module.arguments conflict)
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Module = window.Module || {};
}

const HandTrackerInternal: React.FC<{ onUpdate: (state: HandState) => void }> = ({ onUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let hands: Hands | null = null;
    let camera: Camera | null = null;
    let isActive = true;

    const initTracking = async () => {
      try {
        // First, check if camera access is possible
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e: any) {
          if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
            setError('Camera permission denied. Please allow camera access to use hand gestures.');
          } else {
            setError(`Could not access camera: ${e.message}`);
          }
          return;
        }

        if (!isActive) return;

        hands = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        let lastIsOpen = true;
        let stateCounter = 0;
        const STABLE_FRAMES = 2;

        hands.onResults((results: Results) => {
          if (!isActive) return;
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const wrist = landmarks[0];
            const fingerTips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
            
            let avgDist = 0;
            fingerTips.forEach(tip => {
              const dist = Math.sqrt(
                Math.pow(tip.x - wrist.x, 2) + 
                Math.pow(tip.y - wrist.y, 2) + 
                Math.pow(tip.z - wrist.z, 2)
              );
              avgDist += dist;
            });
            avgDist /= 4;

            // Hysteresis for gesture
            const OPEN_THRESHOLD = 0.35;
            const CLOSE_THRESHOLD = 0.28;
            const isCurrentlyOpen = lastIsOpen;
            
            const rawIsOpen = isCurrentlyOpen ? (avgDist > CLOSE_THRESHOLD) : (avgDist > OPEN_THRESHOLD);

            if (rawIsOpen !== lastIsOpen) {
              stateCounter++;
              if (stateCounter >= STABLE_FRAMES) {
                lastIsOpen = rawIsOpen;
                stateCounter = 0;
              }
            } else {
              stateCounter = 0;
            }

            // Raw position (smoothing is handled in Tree.tsx via useFrame)
            const position = {
              x: (wrist.x - 0.5) * 2,
              y: -(wrist.y - 0.5) * 2,
              z: -wrist.z * 5,
            };

            onUpdate({ 
              isOpen: lastIsOpen, 
              position, 
              isTracking: true 
            });
          } else {
            onUpdate({ isOpen: true, position: null, isTracking: false });
          }
        });

        if (videoRef.current) {
          camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (hands && videoRef.current && isActive) {
                try {
                  await hands.send({ image: videoRef.current });
                } catch (err) {
                  console.error("Mediapipe send error:", err);
                }
              }
            },
            width: 640,
            height: 480,
          });
          await camera.start();
        }
      } catch (err: any) {
        console.error("Failed to initialize hand tracking:", err);
        setError(`Initialization error: ${err.message || 'Unknown error'}`);
      }
    };

    initTracking();

    return () => {
      isActive = false;
      if (camera) {
        camera.stop();
      }
      if (hands) {
        hands.close();
      }
    };
  }, [onUpdate]);

  return (
    <>
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        playsInline
        muted
      />
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] bg-red-500/80 backdrop-blur-md text-white px-6 py-3 rounded-xl shadow-2xl border border-red-400/50 max-w-md text-center">
          <p className="font-bold mb-1">Camera Error</p>
          <p className="text-sm opacity-90">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-1.5 bg-white text-red-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </>
  );
};
