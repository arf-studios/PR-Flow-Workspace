import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Accessibility,
  Contrast,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  Type,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  A11Y_STORAGE_KEY,
  DEFAULT_A11Y_SETTINGS,
  FONT_SCALE_LABELS,
  FONT_SCALE_STEPS,
  countActiveA11yFeatures,
  extractReadableSpeechText,
  fontScaleToRootPx,
  sanitizeA11ySettings,
  stepFontScale,
  type AccessibilitySettings,
} from '../lib/accessibility';

interface AccessibilityMenuProps {
  isDark: boolean;
  onSetTheme: (dark: boolean) => void;
}

const READABLE_SELECTOR =
  'h1, h2, h3, h4, p, button, a, label, input, select, textarea, [role="tab"], [role="alert"], article';

function loadStoredA11ySettings(): AccessibilitySettings {
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_A11Y_SETTINGS };
    return sanitizeA11ySettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_A11Y_SETTINGS };
  }
}

/**
 * Floating circular Accessibility Widget ("Menu Aksesibilitas")
 * - Ukuran Tulisan (Kecil 90% - Ekstra Besar 125% via root rem scaling)
 * - Mode Narator (Web Speech API id-ID: klik/fokus elemen atau baca halaman)
 * - Tema Gelap / Terang (tersinkronisasi penuh dengan state tema aplikasi)
 * - Kontras Tinggi (peningkatan kontras & garis fokus bagi pengguna low-vision)
 */
export const AccessibilityMenu: React.FC<AccessibilityMenuProps> = ({
  isDark,
  onSetTheme,
}) => {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(loadStoredA11ySettings);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const highlightedElRef = useRef<HTMLElement | null>(null);
  const lastSpokenRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });

  const speechSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined';

  const activeCount = useMemo(() => countActiveA11yFeatures(settings), [settings]);

  const clearHighlight = useCallback(() => {
    if (highlightedElRef.current) {
      highlightedElRef.current.classList.remove('a11y-narrator-reading');
      highlightedElRef.current = null;
    }
  }, []);

  const stopSpeech = useCallback(() => {
    if (speechSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore speech synthesis errors in restricted environments
      }
    }
    setIsSpeaking(false);
    clearHighlight();
  }, [clearHighlight, speechSupported]);

  const speakText = useCallback(
    (rawText: string, sourceEl?: HTMLElement | null) => {
      const cleaned = extractReadableSpeechText('', rawText);
      if (!cleaned) return;

      // Prevent duplicate announcements on rapid focus + click of the same control
      const now = Date.now();
      if (
        lastSpokenRef.current.text === cleaned &&
        now - lastSpokenRef.current.at < 450
      ) {
        return;
      }
      lastSpokenRef.current = { text: cleaned, at: now };

      clearHighlight();
      if (sourceEl) {
        sourceEl.classList.add('a11y-narrator-reading');
        highlightedElRef.current = sourceEl;
      }

      if (!speechSupported) {
        setAnnouncement(cleaned);
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new window.SpeechSynthesisUtterance(cleaned);
        utterance.lang = 'id-ID';
        utterance.rate = 0.98;
        utterance.pitch = 1;

        const voices = window.speechSynthesis.getVoices();
        const idVoice =
          voices.find((v) => v.lang.toLowerCase().startsWith('id')) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('ms'));
        if (idVoice) {
          utterance.voice = idVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          clearHighlight();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          clearHighlight();
        };

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
        clearHighlight();
      }
    },
    [clearHighlight, speechSupported]
  );

  // Sync font size & high contrast classes to <html> and persist settings
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${fontScaleToRootPx(settings.fontScale)}px`;
    root.classList.toggle('a11y-high-contrast', settings.highContrast);
    root.dataset.a11yNarrator = settings.narratorEnabled ? 'on' : 'off';

    try {
      localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  }, [settings]);

  // Global narrator listeners (click & keyboard focus) when Mode Narator is enabled
  useEffect(() => {
    if (!settings.narratorEnabled) {
      stopSpeech();
      return;
    }

    const handleElementEvent = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      // Do not hijack clicks on the narrator stop button itself
      if (target.closest('[data-a11y-no-narrate="true"]')) return;

      const readable = target.closest(READABLE_SELECTOR) as HTMLElement | null;
      if (!readable) return;

      const ariaLabel = readable.getAttribute('aria-label');
      const placeholder =
        readable instanceof HTMLInputElement || readable instanceof HTMLTextAreaElement
          ? readable.placeholder
          : null;
      const inputValue =
        readable instanceof HTMLInputElement && readable.type !== 'password' && readable.value
          ? readable.value
          : null;

      const textToRead = extractReadableSpeechText(
        ariaLabel,
        inputValue || readable.innerText || readable.textContent,
        placeholder
      );

      if (textToRead) {
        speakText(textToRead, readable);
      }
    };

    document.addEventListener('click', handleElementEvent, true);
    document.addEventListener('focusin', handleElementEvent, true);

    return () => {
      document.removeEventListener('click', handleElementEvent, true);
      document.removeEventListener('focusin', handleElementEvent, true);
    };
  }, [settings.narratorEnabled, speakText, stopSpeech]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  // Close popover on outside click or Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [open]);

  const handleAdjustFont = (direction: 'increase' | 'decrease') => {
    setSettings((prev) => {
      const nextScale = stepFontScale(prev.fontScale, direction);
      const msg = `Ukuran tulisan ${FONT_SCALE_LABELS[nextScale]} (${nextScale}%)`;
      setAnnouncement(msg);
      if (prev.narratorEnabled) speakText(msg);
      return { ...prev, fontScale: nextScale };
    });
  };

  const handleToggleNarrator = () => {
    setSettings((prev) => {
      const next = !prev.narratorEnabled;
      if (next) {
        const msg =
          'Mode narator aktif. Klik atau fokus pada teks untuk membacakannya.';
        setAnnouncement(msg);
        window.setTimeout(() => speakText(msg), 60);
      } else {
        stopSpeech();
        setAnnouncement('Mode narator dinonaktifkan.');
      }
      return { ...prev, narratorEnabled: next };
    });
  };

  const handleReadPageSummary = () => {
    const main = document.querySelector('main') || document.body;
    const heading = main.querySelector('h1, h2')?.textContent?.trim() || document.title;
    const paragraphs = Array.from(main.querySelectorAll('p'))
      .map((p) => p.textContent?.trim() || '')
      .filter((t) => t.length > 24)
      .slice(0, 2)
      .join('. ');
    const summary = extractReadableSpeechText('', `${heading}. ${paragraphs}`, '', 420);
    if (summary) {
      speakText(summary, (main.querySelector('h1, h2') as HTMLElement | null) || null);
    }
  };

  const handleToggleContrast = () => {
    setSettings((prev) => {
      const next = !prev.highContrast;
      const msg = next ? 'Kontras tinggi diaktifkan.' : 'Kontras standar diaktifkan.';
      setAnnouncement(msg);
      if (prev.narratorEnabled) speakText(msg);
      return { ...prev, highContrast: next };
    });
  };

  const handleSelectTheme = (dark: boolean) => {
    onSetTheme(dark);
    const msg = dark ? 'Tema gelap diaktifkan.' : 'Tema terang diaktifkan.';
    setAnnouncement(msg);
    if (settings.narratorEnabled) speakText(msg);
  };

  const handleReset = () => {
    stopSpeech();
    setSettings({ ...DEFAULT_A11Y_SETTINGS });
    setAnnouncement('Pengaturan aksesibilitas dikembalikan ke standar.');
  };

  const atMinFont = settings.fontScale === FONT_SCALE_STEPS[0];
  const atMaxFont = settings.fontScale === FONT_SCALE_STEPS[FONT_SCALE_STEPS.length - 1];

  return (
    <div
      ref={containerRef}
      className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3"
    >
      {/* Screen-reader status announcer */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Accessibility Popover Panel */}
      <AnimatePresence>
        {open && (
          <motion.section
            key="a11y-panel"
            id="a11y-menu-panel"
            role="dialog"
            aria-label="Pengaturan Aksesibilitas"
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 10, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 8, scale: 0.96 }
            }
            transition={{
              duration: prefersReducedMotion ? 0.14 : 0.22,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ transformOrigin: '100% 100%' }}
            className="w-[20.5rem] max-w-[calc(100vw-2rem)] rounded-[26px] glass-panel p-4 text-slate-900 dark:text-slate-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Accessibility className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-landing font-bold text-sm leading-tight text-slate-900 dark:text-white whitespace-nowrap">
                    Aksesibilitas
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Bantuan baca &amp; tampilan
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    aria-label="Reset pengaturan aksesibilitas"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8]"
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  aria-label="Tutup menu aksesibilitas"
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8]"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {/* 1. Ukuran Tulisan */}
              <div className="rounded-2xl bg-slate-900/[0.04] dark:bg-white/[0.05] p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                    <Type className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#2CE59B] shrink-0" aria-hidden="true" />
                    Ukuran Tulisan
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-[#0284C7] dark:text-[#2CE59B] whitespace-nowrap">
                    {FONT_SCALE_LABELS[settings.fontScale]} · {settings.fontScale}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={atMinFont}
                    onClick={() => handleAdjustFont('decrease')}
                    aria-label="Perkecil ukuran tulisan"
                    className="h-9 px-3 rounded-xl bg-white/85 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-100 hover:border-[#17B5E8]/60 disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8]"
                  >
                    <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>A</span>
                  </button>

                  <div
                    className="flex-1 grid grid-cols-4 gap-1 px-1"
                    aria-hidden="true"
                  >
                    {FONT_SCALE_STEPS.map((step) => (
                      <span
                        key={step}
                        className={`h-1.5 rounded-full transition-colors ${
                          step <= settings.fontScale
                            ? 'bg-gradient-to-r from-[#0284C7] to-[#2CE59B]'
                            : 'bg-slate-300/70 dark:bg-white/15'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={atMaxFont}
                    onClick={() => handleAdjustFont('increase')}
                    aria-label="Perbesar ukuran tulisan"
                    className="h-9 px-3 rounded-xl bg-white/85 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-100 hover:border-[#17B5E8]/60 disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8]"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="text-sm">A</span>
                  </button>
                </div>
              </div>

              {/* 2. Mode Narator */}
              <div className="rounded-2xl bg-slate-900/[0.04] dark:bg-white/[0.05] p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                      <Volume2 className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#2CE59B]" aria-hidden="true" />
                      Mode Narator
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {!speechSupported
                        ? 'Browser tidak mendukung suara narator'
                        : settings.narratorEnabled
                          ? isSpeaking
                            ? 'Sedang membacakan teks...'
                            : 'Klik atau fokus teks untuk dibacakan'
                          : 'Bacakan teks halaman secara otomatis'}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.narratorEnabled}
                    aria-label="Aktifkan atau nonaktifkan Mode Narator"
                    onClick={handleToggleNarrator}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8] ${
                      settings.narratorEnabled
                        ? 'bg-gradient-to-r from-[#0284C7] to-[#0EA5A4]'
                        : 'bg-slate-300/90 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        settings.narratorEnabled ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {settings.narratorEnabled && speechSupported && (
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      data-a11y-no-narrate="true"
                      onClick={handleReadPageSummary}
                      className="py-1.5 px-2.5 rounded-xl bg-white/85 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 hover:border-[#17B5E8]/60 text-[11px] font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8]"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#2CE59B]" aria-hidden="true" />
                      Baca Halaman
                    </button>
                    <button
                      type="button"
                      data-a11y-no-narrate="true"
                      onClick={stopSpeech}
                      className="py-1.5 px-2.5 rounded-xl bg-white/85 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 hover:border-rose-400/60 text-[11px] font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8]"
                    >
                      <VolumeX className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
                      Berhenti
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Tema Gelap / Terang */}
              <div className="rounded-2xl bg-slate-900/[0.04] dark:bg-white/[0.05] p-3 space-y-2">
                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">
                  Tema Tampilan
                </span>
                <div
                  role="group"
                  aria-label="Pilih tema gelap atau terang"
                  className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900/70"
                >
                  <button
                    type="button"
                    aria-pressed={!isDark}
                    onClick={() => handleSelectTheme(false)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8] ${
                      !isDark
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-[#F37021]" aria-hidden="true" />
                    Terang
                  </button>
                  <button
                    type="button"
                    aria-pressed={isDark}
                    onClick={() => handleSelectTheme(true)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8] ${
                      isDark
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-[#17B5E8]" aria-hidden="true" />
                    Gelap
                  </button>
                </div>
              </div>

              {/* 4. Kontras Tinggi (bantuan penglihatan low-vision) */}
              <div className="rounded-2xl bg-slate-900/[0.04] dark:bg-white/[0.05] px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                  <Contrast className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#2CE59B]" aria-hidden="true" />
                  Kontras Tinggi
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.highContrast}
                  aria-label="Aktifkan atau nonaktifkan Kontras Tinggi"
                  onClick={handleToggleContrast}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8] ${
                    settings.highContrast
                      ? 'bg-gradient-to-r from-[#0284C7] to-[#0EA5A4]'
                      : 'bg-slate-300/90 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      settings.highContrast ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Circular Floating Accessibility Trigger Button (48x48px compact professional badge) */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="a11y-menu-panel"
        aria-label={
          open
            ? 'Tutup menu aksesibilitas'
            : `Buka menu aksesibilitas${activeCount > 0 ? ` (${activeCount} fitur aktif)` : ''}`
        }
        title="Menu Aksesibilitas"
        className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] text-white flex items-center justify-center shadow-[0_12px_28px_-8px_rgba(2,132,199,0.65)] ring-2 ring-white/80 dark:ring-slate-900/80 hover:scale-105 active:scale-95 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#17B5E8]"
      >
        <Accessibility className="w-5 h-5" aria-hidden="true" />
        {activeCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold leading-[18px] text-center tabular-nums shadow-sm"
          >
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );
};
