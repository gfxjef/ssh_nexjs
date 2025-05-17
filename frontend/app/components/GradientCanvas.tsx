'use client';

import React, { useEffect, useState, FC, useCallback, useRef } from 'react';
import Script from 'next/script';

// Declarar la clase Gradient global para TypeScript
declare global {
  interface Window {
    Gradient: any; // Simplificar a any para evitar conflictos con la definición global del script
  }
  // También declarar Gradient globalmente por si acaso no se adjunta a window directamente
  // pero se vuelve accesible en el scope global.
  var Gradient: any;
}

const GradientCanvas: FC = () => {
  const canvasId = "gradient-canvas-unique-id"; // ID único para el canvas
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [gradientInitialized, setGradientInitialized] = useState(false);
  const pollerIntervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const initializeGradient = useCallback(() => {
    let GradientClass = window.Gradient || (typeof Gradient !== 'undefined' ? Gradient : undefined);

    if (gradientInitialized || typeof GradientClass === 'undefined') {
      console.log("[Debug] initializeGradient: Already initialized or Gradient class not found.");
      return;
    }
    console.log("[Debug] initializeGradient: Attempting initialization with GradientClass:", GradientClass);
    const canvasElement = document.getElementById(canvasId);
    console.log("[Debug] initializeGradient: canvasElement:", canvasElement);
    if (canvasElement) {
      console.log("[Debug] initializeGradient: Canvas element found. Attempting new GradientClass().");
      try {
        const gradient = new GradientClass();
        console.log("[Debug] initializeGradient: new GradientClass() success. Instance:", gradient);
        console.log("[Debug] initializeGradient: Attempting gradient.initGradient().");
        gradient.initGradient(`#${canvasId}`);
        console.log("[Debug] initializeGradient: gradient.initGradient() called.");
        setGradientInitialized(true);
        console.log("Gradient initialized successfully ONCE."); // Log modificado para claridad
      } catch (error) {
        console.error("[Debug] initializeGradient: Error during gradient initialization:", error);
      }
    } else {
      console.warn(`[Debug] initializeGradient: Canvas with id #${canvasId} not found when trying to initialize.`);
    }
  }, [gradientInitialized, canvasId]);

  // Efecto principal para la lógica de inicialización
  useEffect(() => {
    console.log(`[Debug] MAIN useEffect triggered. scriptLoaded: ${scriptLoaded}, gradientInitialized: ${gradientInitialized}, window.Gradient defined: ${typeof window.Gradient !== 'undefined'}`);

    if (gradientInitialized) {
      console.log("[Debug] MAIN: Gradient already initialized. Doing nothing.");
      return; // Ya inicializado, no hacer nada.
    }

    let GradientClass = window.Gradient || (typeof Gradient !== 'undefined' ? Gradient : undefined);

    if (typeof GradientClass !== 'undefined') {
      console.log("[Debug] MAIN: Gradient class immediately available. Initializing.");
      initializeGradient();
    } else if (scriptLoaded) {
      console.log("[Debug] MAIN: Gradient class NOT available, but scriptLoaded is true. Starting poller.");
      // Limpiar poller anterior si, por alguna razón, estuviera activo
      if (pollerIntervalIdRef.current) {
        clearInterval(pollerIntervalIdRef.current);
      }
      pollerIntervalIdRef.current = setInterval(() => {
        GradientClass = window.Gradient || (typeof Gradient !== 'undefined' ? Gradient : undefined);
        console.log("[Debug] Poller: Checking for GradientClass... Found:", typeof GradientClass !== 'undefined');
        if (typeof GradientClass !== 'undefined') {
          if (pollerIntervalIdRef.current) clearInterval(pollerIntervalIdRef.current);
          pollerIntervalIdRef.current = null;
          console.log("[Debug] Poller: GradientClass found! Initializing.");
          initializeGradient();
        }
      }, 200);
    } else {
      console.log("[Debug] MAIN: Gradient class NOT available and scriptLoaded is false. Waiting for script to load.");
    }

    // Función de limpieza para el efecto principal
    return () => {
      console.log("[Debug] Cleanup for MAIN useEffect. Clearing poller if active.");
      if (pollerIntervalIdRef.current) {
        clearInterval(pollerIntervalIdRef.current);
        pollerIntervalIdRef.current = null;
        console.log("[Debug] Poller interval cleared in MAIN useEffect cleanup.");
      }
    };
  }, [scriptLoaded, gradientInitialized, initializeGradient]);

  // Efecto para resetear gradientInitialized al desmontar el componente
  useEffect(() => {
    return () => {
      console.log("[Debug] GradientCanvas UNMOUNTING: Resetting gradientInitialized to false.");
      setGradientInitialized(false);
      // Es buena práctica limpiar el poller aquí también, como doble seguro.
      if (pollerIntervalIdRef.current) {
        clearInterval(pollerIntervalIdRef.current);
        pollerIntervalIdRef.current = null;
        console.log("[Debug] Poller interval cleared in UNMOUNT cleanup as a safeguard.");
      }
    };
  }, []); // El array vacío asegura que esto se ejecute solo al montar y desmontar

  return (
    <>
      <Script
        src="/js/minigl.js" // Asegúrate de que minigl.js esté en public/js/minigl.js
        strategy="lazyOnload" // Carga el script después de que la página sea interactiva
        onLoad={() => {
          console.log("[Debug] Script onLoad triggered for minigl.js");
          setScriptLoaded(true);
        }}
        onError={(e) => {
          console.error("Error loading minigl.js:", e);
          // Considerar si se debe setScriptLoaded(false) o alguna otra acción de error
        }}
      />
      {/* Contenedor para el canvas, simula .background--custom del HTML original */}
      <div className="fixed inset-0 -z-20 overflow-hidden bg-white">
        <canvas
          id={canvasId} // ID para que minigl.js lo encuentre
          className="absolute w-full h-full -z-10" // Estilos para cubrir el fondo
          style={{
            // Aplicar la transformación como en el CSS original
            // transform: 'rotate(0deg) scale(2) translateY(-12%)'
            transform: 'scale(2) translateY(-12%)',
            // Variables CSS para los colores y velocidad del gradiente, usadas por minigl.js
            // TypeScript puede quejarse de las variables CSS en 'style', por eso el ts-ignore si fuera necesario
            // @ts-ignore
            '--gradient-color-1': '#6CBA9D',
            '--gradient-color-2': '#3C4262',
            '--gradient-color-3': '#F58733',
            '--gradient-color-4': '#3C4262',
            '--gradient-speed': '0.000006',
          } as React.CSSProperties}
        />
      </div>
    </>
  );
};

export default GradientCanvas;
