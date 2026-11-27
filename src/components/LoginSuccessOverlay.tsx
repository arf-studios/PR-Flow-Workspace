import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  LOGIN_CONFETTI_SPECS,
  LOGIN_TRANSITION_EASE,
  LOGIN_TRANSITION_TIMING,
  type LoginFlowState,
} from '../lib/loginTransition';

interface LoginSuccessOverlayProps {
  flowState: LoginFlowState;
  workspaceId?: string;
  userName?: string;
}

/**
 * Overlay animasi sukses modern di dalam kartu "Portal Akses Agensi PR".
 * - Tahap 2 (success): lingkaran gradient biru-tosca spring scale-in, ripple ring 1x,
 *   centang SVG stroke-dashoffset, 12 partikel confetti halus, dan teks stagger.
 * - Tahap 3 (redirecting): progress bar gradient berbasis GPU transform (scaleX)
 *   + gradient reveal halus menjelang perpindahan ke dashboard.
 * - Hormati prefers-reduced-motion & aksesibilitas aria-live="polite".
 */
export const LoginSuccessOverlay: React.FC<LoginSuccessOverlayProps> = ({
  flowState,
  workspaceId,
  userName,
}) => {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const statusHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const visible = flowState === 'success' || flowState === 'redirecting';

  // Kelola fokus ke judul status saat verifikasi berhasil agar ramah pembaca layar & keyboard
  useEffect(() => {
    if (flowState === 'success') {
      const id = window.requestAnimationFrame(() => {
        statusHeadingRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(id);
    }
  }, [flowState]);

  const liveAnnouncement =
    flowState === 'loading'
      ? 'Memverifikasi kredensial agensi Anda...'
      : flowState === 'success'
        ? 'Verifikasi Berhasil. Menyiapkan workspace Anda...'
        : flowState === 'redirecting'
          ? 'Membuka dashboard workspace...'
          : '';

  return (
    <>
      {/* Live region aksesibilitas selalu terpasang agar perubahan status terbaca screen reader */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      <AnimatePresence>
        {visible && (
          <motion.div
            key="login-success-overlay"
            data-login-stage={flowState}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              scale:
                !prefersReducedMotion && flowState === 'redirecting'
                  ? 1.02
                  : 1,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0.2 : 0.38,
              ease: LOGIN_TRANSITION_EASE,
            }}
            className="absolute -inset-6 sm:-inset-8 z-20 flex flex-col items-center justify-center px-6 py-8 text-center rounded-[30px] bg-white/88 dark:bg-slate-900/90 backdrop-blur-xl"
          >
            {/* Lencana Lingkaran Gradient + Ripple + Confetti Mikro */}
            <div className="relative flex items-center justify-center mb-6">
              {/* Ring pulse / ripple tipis 1x */}
              {!prefersReducedMotion && (
                <motion.span
                  aria-hidden="true"
                  initial={{ scale: 0.78, opacity: 0.6 }}
                  animate={{ scale: 1.95, opacity: 0 }}
                  transition={{
                    duration: 0.78,
                    delay: 0.08,
                    ease: LOGIN_TRANSITION_EASE,
                  }}
                  className="pointer-events-none absolute w-20 h-20 rounded-full border-2 border-[#17B5E8]/70 dark:border-[#2CE59B]/70"
                />
              )}

              {/* Maksimal 12 partikel confetti halus warna biru-tosca (pure GPU transform + opacity) */}
              {!prefersReducedMotion &&
                LOGIN_CONFETTI_SPECS.map((dot) => (
                  <motion.span
                    key={dot.id}
                    aria-hidden="true"
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    animate={{
                      x: dot.dx,
                      y: dot.dy,
                      scale: [0, 1.15, 0.75],
                      opacity: [0, 0.95, 0],
                    }}
                    transition={{
                      duration: 0.72,
                      delay: dot.delaySec,
                      ease: LOGIN_TRANSITION_EASE,
                    }}
                    style={{
                      width: dot.size,
                      height: dot.size,
                      backgroundColor: dot.color,
                    }}
                    className="pointer-events-none absolute rounded-full will-change-transform"
                  />
                ))}

              {/* Lingkaran utama bergradient sama dengan tombol "Masuk ke Workspace" */}
              <motion.div
                initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0.2 }
                    : { type: 'spring', stiffness: 320, damping: 21, mass: 0.8 }
                }
                className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-[0_18px_38px_-12px_rgba(23,181,232,0.62)]"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, var(--login-grad-start) 0%, var(--login-grad-mid) 52%, var(--login-grad-end) 100%)',
                }}
              >
                {/* SVG Centang dengan efek stroke-dashoffset (pathLength) */}
                <svg
                  viewBox="0 0 48 48"
                  fill="none"
                  className="w-10 h-10 text-white"
                  aria-hidden="true"
                >
                  <motion.path
                    d="M12.5 25.2L20.4 33L36 16.5"
                    stroke="currentColor"
                    strokeWidth="4.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={prefersReducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0.01 }
                        : {
                            duration: 0.48,
                            delay: 0.16,
                            ease: LOGIN_TRANSITION_EASE,
                          }
                    }
                  />
                </svg>
              </motion.div>
            </div>

            {/* Teks Status Staggered Fade-Up */}
            <motion.h3
              ref={statusHeadingRef}
              tabIndex={-1}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: prefersReducedMotion ? 0.2 : 0.42,
                delay: prefersReducedMotion ? 0.04 : 0.22,
                ease: LOGIN_TRANSITION_EASE,
              }}
              className="font-landing font-bold text-xl tracking-tight text-slate-900 dark:text-white outline-none"
            >
              Verifikasi Berhasil
            </motion.h3>

            <motion.p
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: prefersReducedMotion ? 0.2 : 0.42,
                delay: prefersReducedMotion ? 0.08 : 0.34,
                ease: LOGIN_TRANSITION_EASE,
              }}
              className="text-sm text-slate-600 dark:text-slate-300 mt-1.5"
            >
              Menyiapkan workspace Anda...
            </motion.p>

            {(workspaceId || userName) && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 0.35,
                  delay: prefersReducedMotion ? 0.1 : 0.44,
                  ease: LOGIN_TRANSITION_EASE,
                }}
                className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium"
              >
                {userName ? `${userName} · ` : ''}
                <span className="font-mono font-semibold text-[#0284C7] dark:text-[#2CE59B]">
                  {workspaceId}
                </span>
              </motion.p>
            )}

            {/* Tahap 3: Progress bar tipis bergradient (GPU scaleX, bukan width) */}
            <div className="w-full max-w-[230px] mt-6">
              <div
                aria-hidden="true"
                className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden"
              >
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{
                    scaleX: flowState === 'redirecting' ? 1 : 0.16,
                  }}
                  transition={{
                    duration:
                      prefersReducedMotion
                        ? 0.2
                        : flowState === 'redirecting'
                          ? LOGIN_TRANSITION_TIMING.redirectingMs / 1000
                          : 0.45,
                    ease: LOGIN_TRANSITION_EASE,
                  }}
                  style={{
                    transformOrigin: '0% 50%',
                    backgroundImage:
                      'linear-gradient(90deg, var(--login-grad-start) 0%, var(--login-grad-mid) 52%, var(--login-tosca) 100%)',
                  }}
                  className="h-full w-full rounded-full will-change-transform"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tahap 3 akhir: Fullscreen gradient reveal wipe via Portal ke document.body agar tidak terpotong backdrop-filter kartu */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {flowState === 'redirecting' && !prefersReducedMotion && (
              <motion.div
                key="login-redirect-wipe"
                data-login-wipe="active"
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  delay: LOGIN_TRANSITION_TIMING.wipeDelayMs / 1000,
                  duration: 0.36,
                  ease: LOGIN_TRANSITION_EASE,
                }}
                className="fixed inset-0 z-[80] pointer-events-none backdrop-blur-xl"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 50% 45%, rgba(23, 181, 232, 0.36) 0%, rgba(44, 229, 155, 0.28) 42%, rgba(2, 132, 199, 0.28) 100%)',
                }}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};
