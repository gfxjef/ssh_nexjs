'use client'

import React, { useRef, useEffect } from 'react';

const GradientBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && typeof window !== 'undefined' && window.Gradient) {
      const gradient = new window.Gradient();
      gradient.initGradient('#canvas'); // Make sure the ID matches
    }
  }, []);

  return (
    <div 
      style={{
        width: '100vw',
        height: '100vh',
        position: 'absolute',
        overflow: 'hidden',
        zIndex: -2,
        top: 0,
        left: 0,
      }}
    >
      <canvas 
        id="canvas" // This ID must match what initGradient expects
        ref={canvasRef}
        style={{
          zIndex: -1,
          position: 'absolute',
          width: '100%',
          height: '100%',
          transform: 'rotate(0deg) scale(2) translateY(-12%)',
          // Pass CSS variables for gradient colors and speed
          // These names come from your original HTML
          // @ts-ignore 
          '--gradient-color-1': '#6CBA9D',
          // @ts-ignore
          '--gradient-color-2': '#3C4262',
          // @ts-ignore
          '--gradient-color-3': '#F58733',
          // @ts-ignore
          '--gradient-color-4': '#3C4262',
          // @ts-ignore
          '--gradient-speed': '0.000006',
        }}
      />
    </div>
  );
};

export default GradientBackground; 