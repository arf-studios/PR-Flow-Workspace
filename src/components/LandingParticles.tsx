import React, { useEffect, useRef } from 'react';
import {
  PARTICLE_CONFIG,
  type ParticleFieldBuffers,
  computeEffectiveDpr,
  createParticleField,
  normalizeDeltaFrames,
  stepParticleField,
} from '../lib/particleField';

// ==================== PENGATURAN MUDAH DIUBAH ====================
const DENSITY = PARTICLE_CONFIG.density; // partikel per piksel persegi
const MAX_PARTICLES = PARTICLE_CONFIG.maxParticles; // batas maksimal partikel (160)
const MAX_DPR = PARTICLE_CONFIG.maxDpr; // batas devicePixelRatio (maks 2)
const SPEED = PARTICLE_CONFIG.speed; // kecepatan gerak pelan & halus (baseline 60fps)
const MIN_RADIUS = PARTICLE_CONFIG.minRadius; // radius titik terkecil (px)
const MAX_RADIUS = PARTICLE_CONFIG.maxRadius; // radius titik terbesar (px)
const WRAP_PADDING = PARTICLE_CONFIG.wrapPadding; // margin wrap-around di luar tepi layar
const RESIZE_DEBOUNCE_MS = PARTICLE_CONFIG.resizeDebounceMs; // jeda debounce resize (ms)
const DARK_ALPHAS = PARTICLE_CONFIG.darkAlphas; // 3 kelompok opacity di mode gelap
const LIGHT_ALPHAS = PARTICLE_CONFIG.lightAlphas; // 3 kelompok opacity di mode terang
const TWO_PI = Math.PI * 2;
// =================================================================

interface LandingParticlesProps {
  isDark: boolean;
}

/**
 * Efek partikel latar fullscreen berbasis satu elemen <canvas>.
 * - Menggunakan TypedArray tanpa alokasi objek/array di dalam loop animasi.
 * - Menggambar per kelompok opacity (1 beginPath + 1 fill per kelompok).
 * - Konsisten di layar 60Hz maupun 120Hz lewat normalisasi delta time.
 * - Otomatis pause saat tab tersembunyi dan statis jika prefers-reduced-motion aktif.
 */
export const LandingParticles: React.FC<LandingParticlesProps> = ({ isDark }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDarkRef = useRef<boolean>(isDark);
  const drawRef = useRef<(() => void) | null>(null);

  // Sinkronkan tema aktif tanpa mereset posisi partikel yang sedang bergerak
  useEffect(() => {
    isDarkRef.current = isDark;
    drawRef.current?.();
  }, [isDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduceMotion = motionQuery.matches;

    let field: ParticleFieldBuffers | null = null;
    let currentW = 0;
    let currentH = 0;
    let currentDpr = 1;
    let rafId = 0;
    let lastTime = 0;
    let resizeTimer = 0;

    // Gambar seluruh partikel dalam 3 batch opacity (1 beginPath + 1 fill per kelompok)
    const draw = () => {
      if (!field) return;
      const { width, height, x, y, r, groupOffsets } = field;
      const alphas = isDarkRef.current ? DARK_ALPHAS : LIGHT_ALPHAS;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#FFFFFF';

      for (let k = 0; k < alphas.length; k++) {
        const startIdx = groupOffsets[k];
        const endIdx = groupOffsets[k + 1];
        if (startIdx >= endIdx) continue;

        ctx.globalAlpha = alphas[k];
        ctx.beginPath();
        for (let i = startIdx; i < endIdx; i++) {
          const px = x[i];
          const py = y[i];
          const pr = r[i];
          ctx.moveTo(px + pr, py);
          ctx.arc(px, py, pr, 0, TWO_PI);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    drawRef.current = draw;

    // Inisialisasi ulang canvas & buffer partikel berdasarkan ukuran layar saat ini
    const init = () => {
      const nextW = window.innerWidth;
      const nextH = window.innerHeight;
      const nextDpr = computeEffectiveDpr(window.devicePixelRatio || 1, MAX_DPR);

      if (field && nextW === currentW && nextH === currentH && nextDpr === currentDpr) {
        return;
      }

      currentW = nextW;
      currentH = nextH;
      currentDpr = nextDpr;

      canvas.width = Math.round(nextW * nextDpr);
      canvas.height = Math.round(nextH * nextDpr);
      ctx.setTransform(nextDpr, 0, 0, nextDpr, 0, 0);

      field = createParticleField(nextW, nextH, DARK_ALPHAS.length, {
        density: DENSITY,
        maxParticles: MAX_PARTICLES,
        speed: SPEED,
        minRadius: MIN_RADIUS,
        maxRadius: MAX_RADIUS,
      });

      draw();
    };

    // Loop animasi bebas alokasi objek/array per frame
    const loop = (now: number) => {
      if (field) {
        const dtFrames = normalizeDeltaFrames(now - lastTime);
        lastTime = now;
        stepParticleField(field, dtFrames, WRAP_PADDING);
        draw();
      }
      rafId = window.requestAnimationFrame(loop);
    };

    const start = () => {
      if (reduceMotion || document.hidden || rafId) return;
      lastTime = performance.now();
      rafId = window.requestAnimationFrame(loop);
    };

    const stop = () => {
      if (!rafId) return;
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    };

    // Debounce resize agar tidak berat saat ukuran jendela diubah
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(init, RESIZE_DEBOUNCE_MS);
    };

    // Pause otomatis saat tab tidak aktif dan lanjutkan saat kembali aktif
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    // Hormati perubahan preferensi prefers-reduced-motion secara langsung
    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches;
      if (reduceMotion) {
        stop();
        draw();
      } else {
        start();
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    motionQuery.addEventListener('change', handleMotionPreferenceChange);

    init();
    start();

    return () => {
      stop();
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      motionQuery.removeEventListener('change', handleMotionPreferenceChange);
      drawRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="landing-particles-canvas"
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};
