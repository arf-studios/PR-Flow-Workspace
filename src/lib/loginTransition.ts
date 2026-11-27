/**
 * State machine & konfigurasi durasi/partikel untuk urutan animasi login sukses
 * pada "Portal Akses Agensi PR".
 */

export type LoginFlowState = 'idle' | 'loading' | 'success' | 'redirecting';

export type LoginFlowEvent =
  | { type: 'SUBMIT' }
  | { type: 'AUTH_VALID' }
  | { type: 'AUTH_FAILED' }
  | { type: 'BEGIN_REDIRECT' }
  | { type: 'RESET' };

// ==================== KONSTANTA TIMING & WARNA ====================
export const LOGIN_TRANSITION_TIMING = {
  /** Tahap 1: Loading & verifikasi kredensial (0 – 0.8 dtk) */
  loadingMs: 800,
  /** Tahap 2: Lingkaran centang + ripple + teks stagger + confetti (0.8 – 1.6 dtk) */
  successMs: 800,
  /** Tahap 3: Progress bar gradient + wipe reveal ke dashboard (1.6 – 2.65 dtk) */
  redirectingMs: 1050,
  /** Jeda sebelum gradient wipe fullscreen mulai muncul di akhir Tahap 3 */
  wipeDelayMs: 680,
  /** Durasi ringkas ketika prefers-reduced-motion aktif */
  reducedMotionLoadingMs: 220,
  reducedMotionSuccessMs: 420,
  /** Durasi animasi getar (shake) saat kredensial ditolak */
  errorShakeMs: 460,
} as const;

export const LOGIN_TRANSITION_EASE = [0.22, 1, 0.36, 1] as const;

export const LOGIN_TRANSITION_COLORS = {
  gradientStart: '#0284C7',
  gradientMid: '#17B5E8',
  gradientEnd: '#0EA5A4',
  tosca: '#2CE59B',
  skyLight: '#38BDF8',
} as const;

export interface ConfettiDotSpec {
  id: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  delaySec: number;
}

/**
 * Maksimal 12 partikel confetti mikro berwarna biru-cyan-tosca yang ringan
 * (pure GPU transform + opacity, tanpa library tambahan).
 */
export const LOGIN_CONFETTI_SPECS: readonly ConfettiDotSpec[] = [
  { id: 0, dx: -58, dy: -46, size: 6, color: '#17B5E8', delaySec: 0.14 },
  { id: 1, dx: -28, dy: -66, size: 5, color: '#2CE59B', delaySec: 0.16 },
  { id: 2, dx: 12, dy: -68, size: 7, color: '#0284C7', delaySec: 0.15 },
  { id: 3, dx: 48, dy: -52, size: 5, color: '#2CE59B', delaySec: 0.18 },
  { id: 4, dx: 68, dy: -16, size: 6, color: '#38BDF8', delaySec: 0.17 },
  { id: 5, dx: 64, dy: 24, size: 5, color: '#0EA5A4', delaySec: 0.2 },
  { id: 6, dx: 38, dy: 56, size: 6, color: '#17B5E8', delaySec: 0.19 },
  { id: 7, dx: -4, dy: 64, size: 5, color: '#2CE59B', delaySec: 0.16 },
  { id: 8, dx: -46, dy: 52, size: 6, color: '#0284C7', delaySec: 0.2 },
  { id: 9, dx: -68, dy: 18, size: 5, color: '#38BDF8', delaySec: 0.17 },
  { id: 10, dx: -64, dy: -14, size: 7, color: '#0EA5A4', delaySec: 0.15 },
  { id: 11, dx: 24, dy: -44, size: 4, color: '#2CE59B', delaySec: 0.21 },
] as const;

/** Reducer state machine sederhana: idle -> loading -> success -> redirecting */
export function loginFlowReducer(
  state: LoginFlowState,
  event: LoginFlowEvent
): LoginFlowState {
  switch (event.type) {
    case 'SUBMIT':
      return state === 'idle' ? 'loading' : state;
    case 'AUTH_VALID':
      return state === 'loading' ? 'success' : state;
    case 'AUTH_FAILED':
      return state === 'loading' ? 'idle' : state;
    case 'BEGIN_REDIRECT':
      return state === 'success' ? 'redirecting' : state;
    case 'RESET':
      return 'idle';
    default:
      return state;
  }
}

/** Total durasi sequence normal (ms) — berada di rentang 2,5 – 3,0 detik */
export function getTotalLoginSequenceMs(): number {
  return (
    LOGIN_TRANSITION_TIMING.loadingMs +
    LOGIN_TRANSITION_TIMING.successMs +
    LOGIN_TRANSITION_TIMING.redirectingMs
  );
}

/**
 * Jalankan pembaruan DOM perpindahan rute menggunakan View Transitions API
 * jika didukung browser & reduced motion tidak aktif, dengan fallback instan.
 */
export function runWithViewTransition(
  updateDom: () => void,
  reducedMotion: boolean
): void {
  if (typeof document === 'undefined' || reducedMotion) {
    updateDom();
    return;
  }

  const docWithVT = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };

  if (typeof docWithVT.startViewTransition === 'function') {
    try {
      docWithVT.startViewTransition(() => {
        updateDom();
      });
      return;
    } catch {
      // Fallback aman bila browser menolak view transition saat tab background
    }
  }

  updateDom();
}
