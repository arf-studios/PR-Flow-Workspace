/**
 * Engine matematis partikel background yang ringan & zero-allocation per frame.
 * Seluruh posisi, kecepatan, dan radius disimpan dalam TypedArray datar
 * serta dikelompokkan kontigu per tingkat opacity untuk batch rendering Canvas 2D.
 */

// ==================== KONFIGURASI PARTIKEL ====================
export const PARTICLE_CONFIG = {
  /** Kepadatan partikel per piksel persegi (otomatis menyesuaikan layar HP & desktop) */
  density: 0.000095,
  /** Batas maksimal jumlah partikel pada layar besar / 4K */
  maxParticles: 160,
  /** Batas maksimal devicePixelRatio agar tetap ringan di layar Retina/HiDPI */
  maxDpr: 2,
  /** Kecepatan gerak pelan & halus (piksel per frame pada baseline 60fps) */
  speed: 0.34,
  /** Radius titik partikel (px) */
  minRadius: 0.9,
  maxRadius: 2.35,
  /** Padding di luar tepi layar untuk efek wrap-around mulus */
  wrapPadding: 4,
  /** Interval normalisasi 60fps (1000 / 60 ms) */
  frameDurationMs: 16.6667,
  /** Batas maksimum faktor delta time agar partikel tidak melompat setelah frame drop */
  maxDeltaFrames: 3,
  /** Waktu debounce saat jendela di-resize (ms) */
  resizeDebounceMs: 150,
  /** 3 kelompok opacity untuk mode gelap (titik putih lembut bercahaya) */
  darkAlphas: [0.34, 0.6, 0.9] as readonly number[],
  /** 3 kelompok opacity untuk mode terang (titik putih tegas di atas latar rada gelap) */
  lightAlphas: [0.62, 0.84, 1.0] as readonly number[],
} as const;
// ==============================================================

export interface ParticleFieldBuffers {
  /** Jumlah partikel aktif */
  count: number;
  /** Dimensi viewport logis (CSS px) */
  width: number;
  height: number;
  /** Posisi X partikel */
  x: Float32Array;
  /** Posisi Y partikel */
  y: Float32Array;
  /** Kecepatan X (px / baseline 60fps frame) */
  vx: Float32Array;
  /** Kecepatan Y (px / baseline 60fps frame) */
  vy: Float32Array;
  /** Radius lingkaran tiap partikel */
  r: Float32Array;
  /**
   * Indeks batas tiap kelompok opacity dalam TypedArray.
   * Kelompok k menempati rentang [groupOffsets[k], groupOffsets[k + 1]).
   * Dengan penyimpanan kontigu, draw() menggambar setiap kelompok tanpa
   * percabangan berulang dan tanpa alokasi array/objek per frame.
   */
  groupOffsets: Int32Array;
}

/** Hitung jumlah partikel berdasarkan luas layar dengan batas maksimum. */
export function computeParticleCount(
  width: number,
  height: number,
  density: number = PARTICLE_CONFIG.density,
  maxParticles: number = PARTICLE_CONFIG.maxParticles
): number {
  if (width <= 0 || height <= 0 || density <= 0 || maxParticles <= 0) return 0;
  return Math.min(maxParticles, Math.floor(width * height * density));
}

/** Batasi devicePixelRatio maksimal ke maxDpr (default 2) demi performa layar Retina. */
export function computeEffectiveDpr(
  rawDpr: number,
  maxDpr: number = PARTICLE_CONFIG.maxDpr
): number {
  if (!Number.isFinite(rawDpr) || rawDpr <= 0) return 1;
  return Math.min(rawDpr, maxDpr);
}

/** Normalisasi delta time (ms) terhadap frame 60Hz agar kecepatan identik di 60Hz & 120Hz. */
export function normalizeDeltaFrames(
  elapsedMs: number,
  frameDurationMs: number = PARTICLE_CONFIG.frameDurationMs,
  maxDeltaFrames: number = PARTICLE_CONFIG.maxDeltaFrames
): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.min(elapsedMs / frameDurationMs, maxDeltaFrames);
}

/**
 * Inisialisasi buffer TypedArray partikel (dipanggil hanya saat mount / debounced resize).
 * Partikel langsung dibagi merata ke dalam kelompok opacity secara kontigu.
 */
export function createParticleField(
  width: number,
  height: number,
  groupCount: number,
  options?: {
    density?: number;
    maxParticles?: number;
    speed?: number;
    minRadius?: number;
    maxRadius?: number;
    random?: () => number;
  }
): ParticleFieldBuffers {
  const density = options?.density ?? PARTICLE_CONFIG.density;
  const maxParticles = options?.maxParticles ?? PARTICLE_CONFIG.maxParticles;
  const speed = options?.speed ?? PARTICLE_CONFIG.speed;
  const minRadius = options?.minRadius ?? PARTICLE_CONFIG.minRadius;
  const maxRadius = options?.maxRadius ?? PARTICLE_CONFIG.maxRadius;
  const rand = options?.random ?? Math.random;

  const count = computeParticleCount(width, height, density, maxParticles);
  const safeGroups = Math.max(1, groupCount);

  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const vx = new Float32Array(count);
  const vy = new Float32Array(count);
  const r = new Float32Array(count);
  const groupOffsets = new Int32Array(safeGroups + 1);

  const basePerGroup = Math.floor(count / safeGroups);
  const remainder = count % safeGroups;

  let cursor = 0;
  for (let k = 0; k < safeGroups; k++) {
    groupOffsets[k] = cursor;
    const size = basePerGroup + (k < remainder ? 1 : 0);
    const end = cursor + size;

    // Skala radius sedikit meningkat pada kelompok opacity lebih terang untuk kedalaman halus
    const depthFactor = safeGroups > 1 ? k / (safeGroups - 1) : 0.5;
    const groupMinR = minRadius + (maxRadius - minRadius) * depthFactor * 0.25;
    const groupMaxR = minRadius + (maxRadius - minRadius) * (0.65 + depthFactor * 0.35);

    for (let i = cursor; i < end; i++) {
      x[i] = rand() * width;
      y[i] = rand() * height;

      // Distribusi arah 360 derajat dengan kecepatan bervariasi namun tidak berhenti total
      const angle = rand() * Math.PI * 2;
      const magnitude = speed * (0.35 + rand() * 0.65);
      vx[i] = Math.cos(angle) * magnitude;
      vy[i] = Math.sin(angle) * magnitude;

      r[i] = groupMinR + rand() * (groupMaxR - groupMinR);
    }

    cursor = end;
  }
  groupOffsets[safeGroups] = count;

  return { count, width, height, x, y, vx, vy, r, groupOffsets };
}

/**
 * Perbarui posisi seluruh partikel secara in-place (0 alokasi objek/array)
 * dengan pergerakan berbasis delta time dan wrap-around di keempat sisi layar.
 */
export function stepParticleField(
  field: ParticleFieldBuffers,
  dtFrames: number,
  wrapPadding: number = PARTICLE_CONFIG.wrapPadding
): void {
  if (dtFrames <= 0 || field.count === 0) return;

  const { count, width, height, x, y, vx, vy } = field;
  const minX = -wrapPadding;
  const maxX = width + wrapPadding;
  const minY = -wrapPadding;
  const maxY = height + wrapPadding;

  for (let i = 0; i < count; i++) {
    let nx = x[i] + vx[i] * dtFrames;
    let ny = y[i] + vy[i] * dtFrames;

    if (nx < minX) nx = maxX;
    else if (nx > maxX) nx = minX;

    if (ny < minY) ny = maxY;
    else if (ny > maxY) ny = minY;

    x[i] = nx;
    y[i] = ny;
  }
}
