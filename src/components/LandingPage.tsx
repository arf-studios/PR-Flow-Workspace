import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  CalendarDays,
  CheckSquare,
  Clapperboard,
  Compass,
  Eye,
  EyeOff,
  FolderKanban,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Menu,
  Moon,
  Radio,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sun,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { BLOG_ARTICLES, BLOG_CATEGORIES } from '../data/landingArticles';
import {
  LOGIN_TRANSITION_TIMING,
  loginFlowReducer,
} from '../lib/loginTransition';
import { normalizeWorkspaceId } from '../lib/prflowLogic';
import { LandingParticles } from './LandingParticles';
import { LoginSuccessOverlay } from './LoginSuccessOverlay';
import type {
  AgencySession,
  BlogArticle,
  LandingTab,
  NotificationKind,
  RegisteredAgencyAccount,
} from '../types/prflow';
import { PR_AGENCY_ROLES } from '../types/prflow';

interface LandingPageProps {
  session: AgencySession | null;
  registeredAccounts: RegisteredAgencyAccount[];
  isDark: boolean;
  onToggleTheme: () => void;
  onRegister: (input: {
    name: string;
    workspaceId: string;
    role: string;
    email: string;
    password: string;
  }) => { error?: string };
  onLogin: (input: {
    workspaceId: string;
    email: string;
    password: string;
    roleOverride?: string;
    remember: boolean;
  }) => { error?: string; session?: AgencySession };
  onCompleteLoginTransition: (validatedSession: AgencySession) => void;
  onEnterWorkspace: () => void;
  onRequestLogout: () => void;
  onNotify: (type: NotificationKind, title: string, message: string) => void;
}

interface RevealBlockProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}

const RevealBlock: React.FC<RevealBlockProps> = ({ children, className = '', delayMs = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof window === 'undefined' ||
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setVisible(true);
      return;
    }

    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.96) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={`scroll-reveal ${visible ? 'is-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

interface AuthCardProps {
  prefix: string;
  defaultMode: 'register' | 'login';
  hasRegisteredAccounts: boolean;
  onRegister: LandingPageProps['onRegister'];
  onLogin: LandingPageProps['onLogin'];
  onCompleteLoginTransition: LandingPageProps['onCompleteLoginTransition'];
  onSuccess?: () => void;
  onBusyChange?: (busy: boolean) => void;
}

const AuthCard: React.FC<AuthCardProps> = ({
  prefix,
  defaultMode,
  hasRegisteredAccounts,
  onRegister,
  onLogin,
  onCompleteLoginTransition,
  onSuccess,
  onBusyChange,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(defaultMode);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  // State machine sederhana: idle -> loading -> success -> redirecting
  const [flowState, dispatchFlow] = useReducer(loginFlowReducer, 'idle');
  const [shakeCount, setShakeCount] = useState(0);
  const [verifiedSession, setVerifiedSession] = useState<AgencySession | null>(null);
  const timersRef = useRef<number[]>([]);
  const errorAlertRef = useRef<HTMLDivElement | null>(null);

  // Register state (all blank — zero demo defaults)
  const [regName, setRegName] = useState('');
  const [regWs, setRegWs] = useState('');
  const [regRole, setRegRole] = useState<string>(PR_AGENCY_ROLES[0]);
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');

  // Login state (all blank — zero demo defaults)
  const [loginWs, setLoginWs] = useState('');
  const [loginRole, setLoginRole] = useState<string>(PR_AGENCY_ROLES[0]);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [remember, setRemember] = useState(true);

  const isBusy = flowState !== 'idle';
  const showOverlay = flowState === 'success' || flowState === 'redirecting';

  const clearScheduledTimers = () => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  };

  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  useEffect(() => {
    return () => {
      clearScheduledTimers();
    };
  }, []);

  const triggerErrorFeedback = (message: string) => {
    setError(message);
    setShakeCount((prev) => prev + 1);
    window.requestAnimationFrame(() => {
      errorAlertRef.current?.focus();
    });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    setError('');
    const result = onRegister({
      name: regName,
      workspaceId: regWs,
      role: regRole,
      email: regEmail,
      password: regPass,
    });
    if (result.error) {
      triggerErrorFeedback(result.error);
      return;
    }
    onSuccess?.();
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Cegah klik ganda selama state machine tidak idle
    if (flowState !== 'idle') return;

    clearScheduledTimers();
    setError('');
    dispatchFlow({ type: 'SUBMIT' });

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const payload = {
      workspaceId: loginWs,
      email: loginEmail,
      password: loginPass,
      roleOverride: loginRole,
      remember,
    };

    const loadingDelay = reducedMotion
      ? LOGIN_TRANSITION_TIMING.reducedMotionLoadingMs
      : LOGIN_TRANSITION_TIMING.loadingMs;

    // Tahap 1 (0 – 0.8 dtk): Tampilkan spinner & verifikasi kredensial
    const t1 = window.setTimeout(() => {
      const result = onLogin(payload);
      if (result.error || !result.session) {
        dispatchFlow({ type: 'AUTH_FAILED' });
        triggerErrorFeedback(result.error || 'Kredensial tidak valid.');
        return;
      }

      const validSession = result.session;
      setVerifiedSession(validSession);
      dispatchFlow({ type: 'AUTH_VALID' });

      if (reducedMotion) {
        // Reduced motion: tampilkan centang statis singkat lalu langsung pindah
        const tReduced = window.setTimeout(() => {
          onSuccess?.();
          onCompleteLoginTransition(validSession);
        }, LOGIN_TRANSITION_TIMING.reducedMotionSuccessMs);
        timersRef.current.push(tReduced);
        return;
      }

      // Tahap 2 (0.8 – 1.6 dtk) -> Tahap 3 (1.6 – 2.65 dtk)
      const t2 = window.setTimeout(() => {
        dispatchFlow({ type: 'BEGIN_REDIRECT' });

        const t3 = window.setTimeout(() => {
          onSuccess?.();
          onCompleteLoginTransition(validSession);
        }, LOGIN_TRANSITION_TIMING.redirectingMs);
        timersRef.current.push(t3);
      }, LOGIN_TRANSITION_TIMING.successMs);
      timersRef.current.push(t2);
    }, loadingDelay);

    timersRef.current.push(t1);
  };

  return (
    <div
      key={shakeCount > 0 ? `shake-${shakeCount}` : 'stable'}
      className={`relative ${shakeCount > 0 ? 'auth-card-shake' : ''}`}
    >
      <div
        aria-hidden={showOverlay}
        className={`space-y-5 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          showOverlay
            ? 'opacity-0 blur-[6px] scale-[0.97] pointer-events-none select-none'
            : 'opacity-100 blur-0 scale-100'
        }`}
      >
        <div>
          <p className="text-xs font-semibold text-[#0284C7] dark:text-[#2CE59B]">
            Portal Akses Agensi PR
          </p>
          <h2 className="font-landing font-bold text-xl tracking-tight text-slate-900 dark:text-white mt-0.5">
            {mode === 'register' ? 'Buat Workspace Agensi Baru' : 'Masuk ke Workspace'}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            {mode === 'register'
              ? 'Mulai dari ruang kerja bersih tanpa data demo—isi sendiri anggota tim, kampanye klien, dan konten PR Anda.'
              : 'Masuk menggunakan Workspace ID dan email agensi yang sudah Anda daftarkan.'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div
          role="tablist"
          aria-label="Mode akses akun"
          className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-900/[0.05] dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/10 text-xs font-semibold"
        >
          <button
            type="button"
            role="tab"
            disabled={isBusy}
            aria-selected={mode === 'register'}
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-800 text-[#0284C7] dark:text-[#2CE59B] shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Daftar Akun
          </button>
          <button
            type="button"
            role="tab"
            disabled={isBusy}
            aria-selected={mode === 'login'}
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-800 text-[#0284C7] dark:text-[#2CE59B] shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Masuk
          </button>
        </div>

        {error && (
          <div
            ref={errorAlertRef}
            tabIndex={-1}
            role="alert"
            aria-live="assertive"
            className="p-3.5 rounded-2xl bg-rose-50/95 dark:bg-rose-950/65 border border-rose-200/90 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium leading-relaxed outline-none"
          >
            {error}
          </div>
        )}

        {mode === 'register' ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={`${prefix}-reg-name`}
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                Nama Lengkap *
              </label>
              <input
                id={`${prefix}-reg-name`}
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Nama lengkap Anda"
                className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor={`${prefix}-reg-ws`}
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                Workspace ID *
              </label>
              <input
                id={`${prefix}-reg-ws`}
                type="text"
                required
                value={regWs}
                onChange={(e) => setRegWs(normalizeWorkspaceId(e.target.value))}
                placeholder="Contoh: PR-AGENSI-01"
                className="w-full px-3.5 py-2.5 text-sm font-mono rounded-2xl glass-input text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={`${prefix}-reg-role`}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              Peran di Agensi PR
            </label>
            <select
              id={`${prefix}-reg-role`}
              value={regRole}
              onChange={(e) => setRegRole(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
            >
              {PR_AGENCY_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`${prefix}-reg-email`}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              Email Agensi *
            </label>
            <input
              id={`${prefix}-reg-email`}
              type="email"
              required
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="nama@agensianda.id"
              className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
            />
          </div>

          <div>
            <label
              htmlFor={`${prefix}-reg-pass`}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              Buat Password (min. 6 karakter) *
            </label>
            <div className="relative">
              <input
                id={`${prefix}-reg-pass`}
                type={showPass ? 'text' : 'password'}
                required
                minLength={6}
                value={regPass}
                onChange={(e) => setRegPass(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full pl-3.5 pr-11 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl transition-colors"
              >
                {showPass ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 active:scale-[0.99] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-[0_12px_28px_-10px_rgba(23,181,232,0.55)] transition-all duration-200"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            Buat Akun &amp; Buka Workspace
          </button>
        </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5" noValidate>
            <fieldset disabled={isBusy} className="space-y-3.5 border-0 p-0 m-0 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${prefix}-login-ws`}
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                  >
                    Workspace ID *
                  </label>
                  <input
                    id={`${prefix}-login-ws`}
                    type="text"
                    required
                    value={loginWs}
                    onChange={(e) => setLoginWs(normalizeWorkspaceId(e.target.value))}
                    placeholder="Contoh: PR-AGENSI-01"
                    className="w-full px-3.5 py-2.5 text-sm font-mono rounded-2xl glass-input text-slate-900 dark:text-white placeholder:text-slate-400 outline-none disabled:opacity-65 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${prefix}-login-role`}
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                  >
                    Peran Aktif
                  </label>
                  <select
                    id={`${prefix}-login-role`}
                    value={loginRole}
                    onChange={(e) => setLoginRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none disabled:opacity-65 disabled:cursor-not-allowed"
                  >
                    {PR_AGENCY_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor={`${prefix}-login-email`}
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Email Agensi *
                </label>
                <input
                  id={`${prefix}-login-email`}
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="nama@agensianda.id"
                  className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white placeholder:text-slate-400 outline-none disabled:opacity-65 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label
                  htmlFor={`${prefix}-login-pass`}
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Password *
                </label>
                <div className="relative">
                  <input
                    id={`${prefix}-login-pass`}
                    type={showPass ? 'text' : 'password'}
                    required
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="Masukkan password Anda"
                    className="w-full pl-3.5 pr-11 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white placeholder:text-slate-400 outline-none disabled:opacity-65 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {showPass ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <label
                className={`flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 ${
                  isBusy ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 accent-[#17B5E8] rounded"
                />
                Ingat sesi saya di perangkat ini
              </label>

              {!hasRegisteredAccounts && (
                <p className="text-xs text-slate-600 dark:text-slate-300 glass-subtle rounded-2xl p-3.5 leading-relaxed">
                  Workspace ini dalam keadaan bersih tanpa akun demo. Belum punya akun?{' '}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setMode('register');
                      setError('');
                    }}
                    className="font-semibold text-[#0284C7] dark:text-[#2CE59B] hover:underline disabled:opacity-60"
                  >
                    Daftar akun baru sekarang
                  </button>
                  .
                </p>
              )}

              <button
                type="submit"
                disabled={isBusy}
                aria-busy={flowState === 'loading'}
                className="w-full min-h-[44px] py-3 px-5 rounded-2xl bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 active:scale-[0.99] disabled:opacity-85 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:active:scale-100 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-[0_12px_28px_-10px_rgba(23,181,232,0.55)] transition-all duration-200"
              >
                {flowState === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Masuk ke Workspace</span>
                  </>
                )}
              </button>
            </fieldset>
          </form>
        )}
      </div>

      {/* Tahap 2 & 3: Overlay animasi sukses centang + progress bar + wipe reveal */}
      <LoginSuccessOverlay
        flowState={flowState}
        workspaceId={verifiedSession?.workspaceId}
        userName={verifiedSession?.name}
      />
    </div>
  );
};

const WORKFLOW_PHASES = [
  {
    num: '01',
    phaseLabel: 'Fase 01',
    title: 'Riset & Strategi PESO',
    desc: 'Petakan segmen audiens, audit sensitivitas isu, tetapkan target KPI funnel, serta distribusikan portofolio Paid, Earned, Shared, dan Owned Media secara terukur.',
    highlights: 'Audit Isu · Pemetaan PESO · Target KPI',
    Icon: Compass,
    iconBg: 'bg-[#17B5E8]/15 dark:bg-[#17B5E8]/20 text-[#0284C7] dark:text-[#38BDF8] border-[#17B5E8]/30',
    accentText: 'text-[#0284C7] dark:text-[#38BDF8]',
    glowHover: 'group-hover:shadow-[0_0_24px_-4px_rgba(23,181,232,0.45)]',
  },
  {
    num: '02',
    phaseLabel: 'Fase 02',
    title: 'Planner & Kalender Kru',
    desc: 'Susun creative brief, jadwalkan tanggal take dan tayang Prime Time dengan detektor bentrok jadwal kru otomatis lintas kampanye, lengkap dengan peta lokasi dan ekspor .ICS.',
    highlights: 'Detektor Bentrok · Peta Lokasi · Sync .ICS',
    Icon: CalendarDays,
    iconBg: 'bg-[#2CE59B]/18 dark:bg-[#2CE59B]/20 text-[#059669] dark:text-[#2CE59B] border-[#2CE59B]/35',
    accentText: 'text-[#059669] dark:text-[#2CE59B]',
    glowHover: 'group-hover:shadow-[0_0_24px_-4px_rgba(44,229,155,0.45)]',
  },
  {
    num: '03',
    phaseLabel: 'Fase 03',
    title: 'Produksi & QC Brand Safety',
    desc: 'Pantau alur Kanban 6 tahap dari Pra-Produksi hingga Siap Tayang dengan checklist peralatan, gerbang pemeriksaan Brand Safety, dan riwayat catatan revisi otomatis.',
    highlights: 'Kanban 6 Tahap · Brand Safety · Log Revisi',
    Icon: Clapperboard,
    iconBg: 'bg-[#F37021]/15 dark:bg-[#F37021]/20 text-[#C2410C] dark:text-[#FF8A47] border-[#F37021]/30',
    accentText: 'text-[#C2410C] dark:text-[#FF8A47]',
    glowHover: 'group-hover:shadow-[0_0_24px_-4px_rgba(243,112,33,0.45)]',
  },
  {
    num: '04',
    phaseLabel: 'Fase 04',
    title: 'Distribusi Multi-Kanal',
    desc: 'Kelola antrean publikasi lintas siaran pers, LinkedIn, Instagram, TikTok, dan YouTube sekaligus memantau rasio sentimen publik serta respons Community Management.',
    highlights: 'Multi-Kanal · Sentimen Publik · Respon Cepat',
    Icon: Radio,
    iconBg: 'bg-[#17B5E8]/15 dark:bg-[#17B5E8]/20 text-[#0284C7] dark:text-[#38BDF8] border-[#17B5E8]/30',
    accentText: 'text-[#0284C7] dark:text-[#38BDF8]',
    glowHover: 'group-hover:shadow-[0_0_24px_-4px_rgba(23,181,232,0.45)]',
  },
  {
    num: '05',
    phaseLabel: 'Fase 05',
    title: 'Evaluasi KPI & Arsip',
    desc: 'Bandingkan capaian aktual terhadap target melalui grafik analitik, jalankan aksi respon krisis PR, arsipkan pembelajaran tim, dan kloning proyek ke siklus berikutnya.',
    highlights: 'Grafik KPI · Respon Krisis · Arsip Digital',
    Icon: BarChart3,
    iconBg: 'bg-[#2CE59B]/18 dark:bg-[#2CE59B]/20 text-[#059669] dark:text-[#2CE59B] border-[#2CE59B]/35',
    accentText: 'text-[#059669] dark:text-[#2CE59B]',
    glowHover: 'group-hover:shadow-[0_0_24px_-4px_rgba(44,229,155,0.45)]',
  },
] as const;

export const LandingPage: React.FC<LandingPageProps> = ({
  session,
  registeredAccounts,
  isDark,
  onToggleTheme,
  onRegister,
  onLogin,
  onCompleteLoginTransition,
  onEnterWorkspace,
  onRequestLogout,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<LandingTab>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [modalAuthBusy, setModalAuthBusy] = useState(false);

  // Subtle GPU-composited parallax background refs (no React re-render on scroll)
  const blobTopLeftRef = useRef<HTMLDivElement>(null);
  const blobMidRightRef = useRef<HTMLDivElement>(null);
  const blobBottomLeftRef = useRef<HTMLDivElement>(null);

  // News & Blog state
  const [blogCategory, setBlogCategory] = useState<string>('Semua');
  const [blogSearch, setBlogSearch] = useState('');
  const [readingArticle, setReadingArticle] = useState<BlogArticle | null>(null);
  const [savedArticles, setSavedArticles] = useState<string[]>([]);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactAgency, setContactAgency] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTeamSize, setContactTeamSize] = useState('5 - 15 Orang (Boutique Agency)');
  const [contactNotes, setContactNotes] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    let rafId = 0;
    const updateParallax = () => {
      rafId = 0;
      const y = window.scrollY;
      if (blobTopLeftRef.current) {
        blobTopLeftRef.current.style.transform = `translate3d(0, ${Math.round(y * 0.14)}px, 0)`;
      }
      if (blobMidRightRef.current) {
        blobMidRightRef.current.style.transform = `translate3d(0, ${Math.round(y * -0.1)}px, 0)`;
      }
      if (blobBottomLeftRef.current) {
        blobBottomLeftRef.current.style.transform = `translate3d(0, ${Math.round(y * 0.08)}px, 0)`;
      }
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateParallax);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const navItems: { id: LandingTab; label: string }[] = [
    { id: 'home', label: 'Beranda' },
    { id: 'about', label: 'Tentang Kami' },
    { id: 'features', label: 'Solusi & Fitur' },
    { id: 'news', label: 'Wawasan PR' },
    { id: 'contact', label: 'Kontak' },
  ];

  const filteredArticles = useMemo(() => {
    const q = blogSearch.trim().toLowerCase();
    return BLOG_ARTICLES.filter((art) => {
      const catMatch = blogCategory === 'Semua' || art.category === blogCategory;
      const queryMatch =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.excerpt.toLowerCase().includes(q) ||
        art.category.toLowerCase().includes(q);
      return catMatch && queryMatch;
    });
  }, [blogCategory, blogSearch]);

  const handleSelectTab = (tab: LandingTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToFeatures = () => {
    if (activeTab !== 'home') {
      setActiveTab('home');
      setTimeout(() => {
        document.getElementById('features-workflow')?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
      return;
    }
    document.getElementById('features-workflow')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePrimaryHeaderCTA = () => {
    if (session) {
      onEnterWorkspace();
    } else {
      setAuthModalOpen(true);
    }
  };

  const toggleSaveArticle = (articleId: string) => {
    setSavedArticles((prev) => {
      const exists = prev.includes(articleId);
      if (exists) {
        onNotify('info', 'Dihapus dari Simpanan', 'Artikel dihapus dari daftar bacaan Anda.');
        return prev.filter((id) => id !== articleId);
      }
      onNotify('success', 'Artikel Disimpan', 'Artikel ditandai untuk referensi tim PR Anda.');
      return [...prev, articleId];
    });
  };

  const handleShareArticle = (title: string) => {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
    onNotify('success', 'Tautan Disalin', `Referensi "${title}" siap dibagikan ke tim Anda.`);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactAgency.trim() || !contactEmail.trim()) {
      onNotify('warning', 'Data Belum Lengkap', 'Mohon isi nama, nama agensi, dan email kerja.');
      return;
    }
    setContactSubmitted(true);
    onNotify(
      'success',
      'Permintaan Diterima',
      `Tim onboarding PRFlow akan menghubungi ${contactAgency.trim()} melalui ${contactEmail.trim()}.`
    );
    setContactName('');
    setContactAgency('');
    setContactEmail('');
    setContactNotes('');
  };

  const defaultAuthMode: 'register' | 'login' =
    registeredAccounts.length > 0 ? 'login' : 'register';

  return (
    <div className="landing-shell relative min-h-screen flex flex-col overflow-x-clip bg-gradient-to-br from-[#8FC0D6] via-[#A2C3D8] to-[#B8C4D4] dark:from-[#040B14] dark:via-[#071422] dark:to-[#0C1320] text-slate-900 dark:text-slate-100">
      {/* Ambient Brand Color Blobs with Subtle Scroll Parallax */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div
          ref={blobTopLeftRef}
          className="absolute -top-36 -left-28 w-[520px] h-[520px] rounded-full opacity-45 dark:opacity-20 blur-[110px] will-change-transform"
          style={{
            background:
              'radial-gradient(circle at center, #2CE59B 0%, rgba(23, 181, 232, 0.35) 55%, transparent 75%)',
          }}
        />
        <div
          ref={blobMidRightRef}
          className="absolute top-[18%] -right-32 w-[560px] h-[560px] rounded-full opacity-45 dark:opacity-22 blur-[120px] will-change-transform"
          style={{
            background:
              'radial-gradient(circle at center, #17B5E8 0%, rgba(44, 229, 155, 0.28) 55%, transparent 75%)',
          }}
        />
        <div
          ref={blobBottomLeftRef}
          className="absolute bottom-[-12%] left-[18%] w-[480px] h-[480px] rounded-full opacity-35 dark:opacity-14 blur-[125px] will-change-transform"
          style={{
            background:
              'radial-gradient(circle at center, #F37021 0%, rgba(243, 112, 33, 0.25) 50%, transparent 75%)',
          }}
        />
      </div>

      {/* Subtle Fullscreen Canvas Particle Background */}
      <LandingParticles isDark={isDark} />

      {/* Strict 3-Zone Frosted Glass Top Bar */}
      <header className="sticky top-0 z-40 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single clean wordmark */}
          <button
            type="button"
            onClick={() => handleSelectTab('home')}
            className="font-landing font-extrabold text-xl tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8] rounded-xl"
          >
            PR<span className="bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#10B981] bg-clip-text text-transparent">Flow</span>
          </button>

          {/* Zone 2: 5 clean single-line text nav links */}
          <nav
            aria-label="Navigasi halaman depan"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`py-1.5 whitespace-nowrap shrink-0 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8] ${
                    active
                      ? 'border-[#17B5E8] text-slate-900 dark:text-white font-semibold'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary CTA (+ mobile menu trigger on small screens) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrimaryHeaderCTA}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold shadow-[0_8px_22px_-6px_rgba(23,181,232,0.55)] transition-all duration-200 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8]"
            >
              {session ? 'Buka Workspace' : 'Masuk Workspace'}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2 rounded-2xl text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <nav
            aria-label="Navigasi seluler"
            className="md:hidden border-t border-white/60 dark:border-white/10 bg-white/85 dark:bg-slate-950/90 backdrop-blur-2xl px-4 py-3 space-y-1"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full text-left px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-[#17B5E8]/12 text-[#0284C7] dark:text-[#2CE59B] font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1">
        {activeTab === 'home' && (
          <div className="animate-view">
            {/* Hero Cover Split */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
                {/* Left Column: Editorial Cover Proposition */}
                <div className="lg:col-span-7 space-y-7">
                  <div className="text-xs sm:text-sm font-semibold text-[#075985] dark:text-[#2CE59B]">
                    Platform Content Planner · PR Agency &amp; Corporate Communications
                  </div>

                  <h1
                    className="font-landing font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] [text-wrap:balance]"
                    style={{ fontSize: 'clamp(2.2rem, 4vw, 3.6rem)' }}
                  >
                    Kendalikan Siklus Konten{' '}
                    <span className="bg-gradient-to-r from-[#0369A1] via-[#0284C7] to-[#0D9488] dark:from-[#38BDF8] dark:via-[#17B5E8] dark:to-[#2CE59B] bg-clip-text text-transparent">
                      PR 5-Fase
                    </span>{' '}
                    dalam Satu Ruang Kerja Terpadu
                  </h1>

                  <p className="text-base sm:text-lg text-slate-800 dark:text-slate-300 leading-relaxed max-w-2xl">
                    Kelola riset audiens dan model PESO, kalender produksi dengan detektor bentrok
                    jadwal kru otomatis, papan Kanban QC Brand Safety, monitoring sentimen
                    multi-kanal, hingga arsip aset digital klien—dimulai dari ruang kerja fresh
                    tanpa data demo.
                  </p>

                  <div className="flex flex-wrap items-center gap-3.5 pt-1">
                    {session ? (
                      <button
                        type="button"
                        onClick={onEnterWorkspace}
                        className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 hover:-translate-y-0.5 text-white text-sm font-semibold shadow-[0_14px_30px_-10px_rgba(23,181,232,0.58)] transition-all duration-200 whitespace-nowrap"
                      >
                        Lanjut ke Workspace ({session.workspaceId})
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const el =
                            document.getElementById('hero-reg-name') ||
                            document.getElementById('hero-login-ws');
                          el?.focus();
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 hover:-translate-y-0.5 text-white text-sm font-semibold shadow-[0_14px_30px_-10px_rgba(23,181,232,0.58)] transition-all duration-200 whitespace-nowrap"
                      >
                        Mulai Workspace Fresh
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleScrollToFeatures}
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full glass-card hover:-translate-y-0.5 text-slate-800 dark:text-slate-100 text-sm font-semibold transition-all duration-200 whitespace-nowrap"
                    >
                      Pelajari Alur 5 Fase
                    </button>
                  </div>

                  {/* Grounded Glass Capability Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-900/10 dark:border-white/10">
                    <div className="p-4 rounded-3xl glass-subtle">
                      <div className="font-landing text-xl sm:text-2xl font-bold tabular-nums text-[#0284C7] dark:text-[#38BDF8] whitespace-nowrap">
                        5 Fase
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        Alur kerja PR dari riset hingga evaluasi
                      </div>
                    </div>
                    <div className="p-4 rounded-3xl glass-subtle">
                      <div className="font-landing text-xl sm:text-2xl font-bold text-[#059669] dark:text-[#2CE59B] whitespace-nowrap">
                        Otomatis
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        Deteksi bentrok jadwal kru lintas kampanye
                      </div>
                    </div>
                    <div className="p-4 rounded-3xl glass-subtle">
                      <div className="font-landing text-xl sm:text-2xl font-bold text-[#C2410C] dark:text-[#FF8A47] whitespace-nowrap">
                        100% Fresh
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        Ruang kerja kosong siap diisi data agensi
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Frosted Glass Agency Account Portal */}
                <div className="lg:col-span-5">
                  <div className="relative overflow-hidden p-6 sm:p-8 rounded-[30px] glass-card">
                    {session ? (
                      <div className="space-y-5 py-2">
                        <div className="flex items-start gap-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-[#2CE59B]/20 border border-[#2CE59B]/40 text-[#059669] dark:text-[#2CE59B] flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#059669] dark:text-[#2CE59B]">
                              Sesi Workspace Aktif
                            </p>
                            <h2 className="font-landing font-bold text-lg text-slate-900 dark:text-white truncate mt-0.5">
                              {session.name}
                            </h2>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                              {session.role} ·{' '}
                              <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                                {session.workspaceId}
                              </span>
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          Anda sedang masuk di ruang kerja agensi ini. Lanjutkan pengelolaan tim,
                          kampanye klien, jadwal produksi, dan arsip digital Anda.
                        </p>

                        <div className="space-y-2.5 pt-1">
                          <button
                            type="button"
                            onClick={onEnterWorkspace}
                            className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-[0_12px_28px_-10px_rgba(23,181,232,0.55)] transition-all duration-200"
                          >
                            Buka Dashboard Workspace
                            <ArrowRight className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={onRequestLogout}
                            className="w-full py-2.5 px-4 rounded-2xl glass-subtle hover:bg-rose-50/90 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-300 text-xs font-semibold transition-colors"
                          >
                            Keluar &amp; Ganti Akun
                          </button>
                        </div>
                      </div>
                    ) : (
                      <AuthCard
                        prefix="hero"
                        defaultMode={defaultAuthMode}
                        hasRegisteredAccounts={registeredAccounts.length > 0}
                        onRegister={onRegister}
                        onLogin={onLogin}
                        onCompleteLoginTransition={onCompleteLoginTransition}
                      />
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Features Section: 5-Phase PR Workflow Highlight */}
            <section
              id="features-workflow"
              aria-labelledby="features-workflow-heading"
              className="relative py-16 lg:py-24 border-t border-white/60 dark:border-white/10"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                <RevealBlock className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="max-w-2xl space-y-2.5">
                    <p className="text-xs sm:text-sm font-semibold text-[#0284C7] dark:text-[#2CE59B]">
                      Fitur &amp; Arsitektur Alur Kerja
                    </p>
                    <h2
                      id="features-workflow-heading"
                      className="font-landing text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance]"
                    >
                      Lima Fase PR Terintegrasi dari Riset hingga Evaluasi KPI
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                      Setiap konten mengalir terstruktur melintasi lima tahap kerja dengan jadwal
                      kru, aset digital, dan capaian KPI yang selalu tersinkronisasi.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectTab('features')}
                    className="self-start md:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card hover:-translate-y-0.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white transition-all duration-200 whitespace-nowrap shrink-0"
                  >
                    Lihat Semua Modul
                    <ArrowRight className="w-4 h-4 text-[#0284C7] dark:text-[#2CE59B]" aria-hidden="true" />
                  </button>
                </RevealBlock>

                {/* Row 1: Featured Phase 01 & 02 (Asymmetric 2-Column) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {WORKFLOW_PHASES.slice(0, 2).map((step, idx) => {
                    const Icon = step.Icon;
                    return (
                      <RevealBlock key={step.num} delayMs={idx * 70}>
                        <article className="group h-full p-7 sm:p-8 rounded-[30px] glass-card glass-card-hover flex flex-col justify-between gap-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                              <div
                                className={`w-13 h-13 rounded-2xl border flex items-center justify-center transition-shadow duration-200 ${step.iconBg} ${step.glowHover}`}
                              >
                                <Icon className="w-6 h-6" aria-hidden="true" />
                              </div>
                              <span
                                className={`font-mono text-xs font-semibold tabular-nums ${step.accentText}`}
                              >
                                {step.phaseLabel} / 05
                              </span>
                            </div>

                            <div className="space-y-2">
                              <h3 className="font-landing font-bold text-xl text-slate-900 dark:text-white tracking-tight">
                                {step.num}. {step.title}
                              </h3>
                              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                {step.desc}
                              </p>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-900/[0.07] dark:border-white/10 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {step.highlights}
                          </div>
                        </article>
                      </RevealBlock>
                    );
                  })}
                </div>

                {/* Row 2: Phase 03, 04 & 05 (3-Column Glass Row) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {WORKFLOW_PHASES.slice(2).map((step, idx) => {
                    const Icon = step.Icon;
                    return (
                      <RevealBlock key={step.num} delayMs={idx * 75}>
                        <article className="group h-full p-6 sm:p-7 rounded-[28px] glass-card glass-card-hover flex flex-col justify-between gap-5">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                              <div
                                className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-shadow duration-200 ${step.iconBg} ${step.glowHover}`}
                              >
                                <Icon className="w-5 h-5" aria-hidden="true" />
                              </div>
                              <span
                                className={`font-mono text-xs font-semibold tabular-nums ${step.accentText}`}
                              >
                                {step.phaseLabel} / 05
                              </span>
                            </div>

                            <div className="space-y-2">
                              <h3 className="font-landing font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                                {step.num}. {step.title}
                              </h3>
                              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                {step.desc}
                              </p>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-900/[0.07] dark:border-white/10 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {step.highlights}
                          </div>
                        </article>
                      </RevealBlock>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-14 animate-view">
            <div className="max-w-3xl space-y-4">
              <p className="text-xs sm:text-sm font-semibold text-[#0284C7] dark:text-[#2CE59B]">
                Tentang PRFlow
              </p>
              <h1 className="font-landing text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance]">
                Dibangun untuk Kejelasan Operasional PR Agency dan Komunikasi Korporasi
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                PRFlow menyatukan perencanaan kampanye klien, jadwal kru produksi, pengendalian mutu
                Brand Safety, manajemen aset digital, dan pelaporan evaluasi ke dalam satu ruang
                kerja yang tertib—bebas dari spreadsheet terpisah dan pesan berulang.
              </p>
            </div>

            {/* Metodologi PESO */}
            <section className="space-y-5">
              <div>
                <h2 className="font-landing text-2xl font-bold text-slate-900 dark:text-white">
                  Metodologi Inti: Kerangka PESO Model
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Setiap konten dipetakan sejak Fase 1 agar portofolio reputasi klien terukur di
                  empat kategori media.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  {
                    name: 'Paid Media',
                    accent: 'text-[#C2410C] dark:text-[#FF8A47]',
                    desc: 'Advertorial media nasional, konten bersponsor, dan kolaborasi KOL terukur untuk akselerasi jangkauan.',
                  },
                  {
                    name: 'Earned Media',
                    accent: 'text-[#059669] dark:text-[#2CE59B]',
                    desc: 'Siaran pers, press tour, wawancara jurnalis, dan liputan editorial untuk kredibilitas pihak ketiga.',
                  },
                  {
                    name: 'Shared Media',
                    accent: 'text-[#0284C7] dark:text-[#38BDF8]',
                    desc: 'Distribusi organik lintas LinkedIn, Instagram, TikTok, serta pengelolaan respons komunitas.',
                  },
                  {
                    name: 'Owned Media',
                    accent: 'text-[#0F766E] dark:text-[#5EEAD4]',
                    desc: 'Artikel website resmi, laporan keberlanjutan ESG, newsletter, dan ruang berita korporasi.',
                  },
                ].map((peso) => (
                  <div
                    key={peso.name}
                    className="p-6 rounded-[28px] glass-card glass-card-hover space-y-2.5"
                  >
                    <h3 className={`font-landing font-bold text-base ${peso.accent}`}>
                      {peso.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {peso.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Tata Kelola & Privasi */}
            <section className="p-7 sm:p-10 rounded-[32px] bg-slate-900/90 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/15 shadow-[0_24px_56px_-18px_rgba(2,6,23,0.55)] text-white space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold text-[#2CE59B]">Tata Kelola Ruang Kerja</p>
                  <h2 className="font-landing text-2xl sm:text-3xl font-bold mt-1">
                    Standar Kerja Terstruktur untuk Data &amp; Reputasi Klien
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handlePrimaryHeaderCTA}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 text-white text-xs sm:text-sm font-semibold whitespace-nowrap self-start transition-all duration-200"
                >
                  {session ? 'Buka Workspace' : 'Buat Workspace Baru'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-3xl bg-white/[0.06] border border-white/10 space-y-2.5">
                  <Lock className="w-5 h-5 text-[#2CE59B]" aria-hidden="true" />
                  <h3 className="font-landing font-bold text-base">Isolasi Workspace ID</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Akses ruang kerja dipisahkan berdasarkan Workspace ID unik dan dilengkapi backup
                    serta pemulihan database JSON penuh.
                  </p>
                </div>
                <div className="p-6 rounded-3xl bg-white/[0.06] border border-white/10 space-y-2.5">
                  <UserCheck className="w-5 h-5 text-[#17B5E8]" aria-hidden="true" />
                  <h3 className="font-landing font-bold text-base">Kejelasan Peran Tim PR</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Pembagian peran jelas antara Account Director, Content Strategist, Production
                    Lead, dan Brand Safety Officer.
                  </p>
                </div>
                <div className="p-6 rounded-3xl bg-white/[0.06] border border-white/10 space-y-2.5">
                  <CheckSquare className="w-5 h-5 text-[#F37021]" aria-hidden="true" />
                  <h3 className="font-landing font-bold text-base">Gerbang QC Brand Safety</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Setiap aset melewati pemeriksaan kualitas visual, tone of voice PR, sensitivitas
                    isu, dan akurasi data sebelum disetujui.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10 animate-view">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs sm:text-sm font-semibold text-[#0284C7] dark:text-[#2CE59B]">
                Solusi &amp; Fitur
              </p>
              <h1 className="font-landing text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance]">
                Seluruh Modul Operasional PR Agency dalam Satu Aplikasi
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Setiap pembaruan di satu modul otomatis memperbarui kalender jadwal, papan Kanban,
                daftar aset digital, dan grafik evaluasi.
              </p>
            </div>

            {/* Asymmetric Frosted Glass Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-7 rounded-[30px] glass-card glass-card-hover space-y-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#17B5E8]/15 border border-[#17B5E8]/30 text-[#0284C7] dark:text-[#38BDF8] flex items-center justify-center">
                  <Compass className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 className="font-landing font-bold text-lg text-slate-900 dark:text-white">
                  01. Matriks Riset Audiens, Audit Isu &amp; Pemetaan PESO
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Dokumentasikan segmen audiens, tren industri, tingkat risiko isu (Rendah, Sedang,
                  Tinggi), target KPI funnel, serta pembeda dari kompetitor sebelum masuk tahap
                  produksi.
                </p>
              </div>

              <div className="p-7 rounded-[30px] glass-card glass-card-hover space-y-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#2CE59B]/18 border border-[#2CE59B]/35 text-[#059669] dark:text-[#2CE59B] flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 className="font-landing font-bold text-lg text-slate-900 dark:text-white">
                  02. Detektor Bentrok Kru &amp; Kalender
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Sistem mendeteksi otomatis jika anggota kru dijadwalkan di dua lokasi liputan pada
                  hari yang sama, dilengkapi ekspor .ICS, tautan Google Calendar, dan rute Maps.
                </p>
              </div>

              <div className="p-7 rounded-[30px] glass-card glass-card-hover space-y-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#F37021]/15 border border-[#F37021]/30 text-[#C2410C] dark:text-[#FF8A47] flex items-center justify-center">
                  <Clapperboard className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 className="font-landing font-bold text-lg text-slate-900 dark:text-white">
                  03. Kanban 6 Tahap &amp; Loop Revisi QC
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Pindahkan kartu dengan drag-and-drop dari Pra-Produksi hingga Siap Tayang.
                  Penolakan QC otomatis mengembalikan kartu ke tahap Editing dengan log catatan.
                </p>
              </div>

              <div className="lg:col-span-2 p-7 rounded-[30px] glass-card glass-card-hover space-y-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#17B5E8]/15 border border-[#17B5E8]/30 text-[#0284C7] dark:text-[#38BDF8] flex items-center justify-center">
                  <Radio className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 className="font-landing font-bold text-lg text-slate-900 dark:text-white">
                  04. Distribusi Multi-Kanal &amp; Monitoring Sentimen Real-Time
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Kelola jadwal tayang Prime Time lintas kanal (Instagram, TikTok, LinkedIn, Siaran
                  Pers, YouTube, Website), pantau rasio sentimen publik, serta status penanganan
                  komentar audiens.
                </p>
              </div>

              <div className="lg:col-span-2 p-7 rounded-[30px] glass-card glass-card-hover space-y-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#2CE59B]/18 border border-[#2CE59B]/35 text-[#059669] dark:text-[#2CE59B] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 className="font-landing font-bold text-lg text-slate-900 dark:text-white">
                  05. Analitik Chart.js, Audit KPI &amp; Respon Krisis PR
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Bandingkan capaian KPI aktual terhadap target, evaluasi komposisi PESO dan tren
                  sentimen melalui tiga grafik interaktif, tentukan akar penyebab, aktifkan aksi
                  optimasi, lalu arsipkan pembelajaran ke repositori permanen.
                </p>
              </div>

              <div className="p-7 rounded-[30px] glass-card glass-card-hover space-y-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#F37021]/15 border border-[#F37021]/30 text-[#C2410C] dark:text-[#FF8A47] flex items-center justify-center">
                  <FolderKanban className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 className="font-landing font-bold text-lg text-slate-900 dark:text-white">
                  06. Repositori Aset (DAM) &amp; Backup JSON/CSV
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Katalog terpusat untuk 01_Brief, 02_Raw_Footage, dan 03_Final_Asset, ditambah
                  ekspor laporan CSV untuk Google Sheets serta backup/restore JSON utuh.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 p-7 rounded-[30px] glass-card">
              <div>
                <h3 className="font-landing font-bold text-lg text-slate-900 dark:text-white">
                  Siap menyiapkan workspace agensi Anda?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  Buat akun baru dalam beberapa detik dan mulai dari database kosong yang bersih.
                </p>
              </div>
              <button
                type="button"
                onClick={handlePrimaryHeaderCTA}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 text-white text-sm font-semibold shadow-[0_12px_28px_-10px_rgba(23,181,232,0.55)] transition-all duration-200 whitespace-nowrap"
              >
                {session ? 'Buka Workspace Sekarang' : 'Buat Akun Workspace'}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-8 animate-view">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-[#0284C7] dark:text-[#2CE59B]">
                  Wawasan PR
                </p>
                <h1 className="font-landing text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
                  Panduan, Riset &amp; Studi Kasus Public Relations
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Referensi taktis untuk strategi PESO, manajemen krisis, dan tata kelola produksi
                  agensi.
                </p>
              </div>

              <div className="relative w-full md:w-72">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <label htmlFor="blog-search-input" className="sr-only">
                  Cari artikel PR
                </label>
                <input
                  id="blog-search-input"
                  type="search"
                  value={blogSearch}
                  onChange={(e) => setBlogSearch(e.target.value)}
                  placeholder="Cari artikel PR..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            {/* Functional Category Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {BLOG_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setBlogCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                    blogCategory === cat
                      ? 'bg-gradient-to-r from-[#0284C7] to-[#17B5E8] text-white shadow-[0_8px_18px_-6px_rgba(23,181,232,0.5)]'
                      : 'glass-subtle text-slate-700 dark:text-slate-200 hover:border-[#17B5E8]/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Article Grid — Clean Unboxed Metadata */}
            {filteredArticles.length === 0 ? (
              <div className="p-12 rounded-[28px] glass-subtle border-dashed text-center text-sm text-slate-600 dark:text-slate-300">
                Tidak ada artikel yang cocok dengan kata kunci &ldquo;{blogSearch}&rdquo;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map((art) => (
                  <article
                    key={art.id}
                    className="p-6 rounded-[28px] glass-card glass-card-hover flex flex-col justify-between gap-5"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-[#0284C7] dark:text-[#2CE59B]">
                          {art.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{art.readTime}</span>
                      </div>
                      <h2 className="font-landing font-bold text-base text-slate-900 dark:text-white leading-snug">
                        <button
                          type="button"
                          onClick={() => setReadingArticle(art)}
                          className="text-left hover:text-[#0284C7] dark:hover:text-[#2CE59B] transition-colors"
                        >
                          {art.title}
                        </button>
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {art.excerpt}
                      </p>
                    </div>

                    <div className="pt-3.5 border-t border-slate-900/[0.07] dark:border-white/10 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{art.date}</span>
                      <button
                        type="button"
                        onClick={() => setReadingArticle(art)}
                        className="font-semibold text-[#0284C7] dark:text-[#2CE59B] hover:underline whitespace-nowrap"
                      >
                        Baca Artikel →
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 animate-view">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 space-y-5">
                <p className="text-xs sm:text-sm font-semibold text-[#0284C7] dark:text-[#2CE59B]">
                  Kontak &amp; Onboarding
                </p>
                <h1 className="font-landing text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Siapkan PRFlow untuk Tim Agensi Anda
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Butuh panduan implementasi alur 5 fase, integrasi webhook notifikasi Slack atau
                  Discord, maupun pendampingan onboarding tim? Kirim pesan melalui formulir ini.
                </p>

                <div className="space-y-3 pt-2 text-xs text-slate-700 dark:text-slate-200">
                  <div className="flex items-center gap-3 p-4 rounded-2xl glass-card">
                    <MapPin className="w-4 h-4 text-[#0284C7] dark:text-[#2CE59B] shrink-0" aria-hidden="true" />
                    <span>Jakarta Selatan, Indonesia</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-2xl glass-card">
                    <Mail className="w-4 h-4 text-[#F37021] shrink-0" aria-hidden="true" />
                    <span>halo@prflow.id</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 p-6 sm:p-8 rounded-[30px] glass-card">
                {contactSubmitted && (
                  <div className="mb-5 p-4 rounded-2xl bg-[#2CE59B]/15 border border-[#2CE59B]/40 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                    Permintaan Anda berhasil dikirim. Anda juga dapat langsung membuat akun baru di
                    tab Beranda untuk mulai menggunakan workspace sekarang.
                  </div>
                )}

                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="contact-name"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                      >
                        Nama Lengkap *
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Nama Anda"
                        className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="contact-agency"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                      >
                        Nama Agensi / Perusahaan *
                      </label>
                      <input
                        id="contact-agency"
                        type="text"
                        required
                        value={contactAgency}
                        onChange={(e) => setContactAgency(e.target.value)}
                        placeholder="Nama organisasi Anda"
                        className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="contact-email"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                      >
                        Email Kerja *
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="nama@agensianda.id"
                        className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="contact-size"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                      >
                        Skala Tim
                      </label>
                      <select
                        id="contact-size"
                        value={contactTeamSize}
                        onChange={(e) => setContactTeamSize(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
                      >
                        <option>5 - 15 Orang (Boutique Agency)</option>
                        <option>16 - 50 Orang (Mid-Size Agency)</option>
                        <option>50+ Orang (Enterprise / Network)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-notes"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                    >
                      Kebutuhan Utama Workspace
                    </label>
                    <textarea
                      id="contact-notes"
                      rows={3}
                      value={contactNotes}
                      onChange={(e) => setContactNotes(e.target.value)}
                      placeholder="Ceritakan alur kerja kampanye PR, krisis, atau integrasi yang dibutuhkan tim Anda..."
                      className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-[0_12px_28px_-10px_rgba(23,181,232,0.55)] transition-all duration-200"
                  >
                    <Send className="w-4 h-4" aria-hidden="true" />
                    Kirim Permintaan Onboarding
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Quiet Frosted Footer */}
      <footer className="relative z-10 glass-subtle border-t border-white/65 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-5">
          <div>
            <div className="font-landing font-bold text-sm text-slate-900 dark:text-white">
              PRFlow Workspace Pro
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Manajemen Konten PR 5-Fase &amp; Repositori Aset Digital.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-300">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className="hover:text-[#0284C7] dark:hover:text-[#2CE59B] transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full glass-card text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#17B5E8]/50 transition-colors"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#F37021]" aria-hidden="true" />
                  Mode Terang
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#0284C7]" aria-hidden="true" />
                  Mode Gelap
                </>
              )}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">© 2026 PRFlow</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal (triggered from header CTA on any tab) */}
      {authModalOpen && !session && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Portal Akses Workspace"
        >
          <div className="glass-card bg-white/90 dark:bg-slate-900/90 rounded-[30px] shadow-2xl w-full max-w-md relative overflow-hidden p-6 sm:p-8">
            <button
              type="button"
              disabled={modalAuthBusy}
              onClick={() => {
                if (!modalAuthBusy) setAuthModalOpen(false);
              }}
              aria-label="Tutup portal akses"
              className="absolute top-4 right-4 z-10 p-2 rounded-2xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors disabled:opacity-0 disabled:pointer-events-none"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
            <AuthCard
              prefix="modal"
              defaultMode={defaultAuthMode}
              hasRegisteredAccounts={registeredAccounts.length > 0}
              onRegister={onRegister}
              onLogin={onLogin}
              onCompleteLoginTransition={onCompleteLoginTransition}
              onBusyChange={setModalAuthBusy}
              onSuccess={() => setAuthModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Blog Reader Modal */}
      {readingArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="blog-reader-title"
        >
          <div className="glass-card bg-white/92 dark:bg-slate-900/92 rounded-[30px] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-900/10 dark:border-white/10 flex items-start justify-between gap-4 shrink-0">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span className="font-semibold text-[#0284C7] dark:text-[#2CE59B]">
                    {readingArticle.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{readingArticle.date}</span>
                  <span aria-hidden="true">·</span>
                  <span>{readingArticle.readTime}</span>
                </div>
                <h2
                  id="blog-reader-title"
                  className="font-landing font-bold text-lg text-slate-900 dark:text-white mt-1 leading-snug"
                >
                  {readingArticle.title}
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {readingArticle.author}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReadingArticle(null)}
                aria-label="Tutup pembaca artikel"
                className="p-2 rounded-2xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 shrink-0 transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {readingArticle.content.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-slate-900/10 dark:border-white/10 bg-slate-900/[0.02] dark:bg-white/[0.03] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSaveArticle(readingArticle.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                    savedArticles.includes(readingArticle.id)
                      ? 'bg-[#17B5E8]/15 border-[#17B5E8]/40 text-[#0284C7] dark:text-[#2CE59B]'
                      : 'glass-subtle text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
                  {savedArticles.includes(readingArticle.id) ? 'Tersimpan' : 'Simpan Artikel'}
                </button>
                <button
                  type="button"
                  onClick={() => handleShareArticle(readingArticle.title)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold glass-subtle text-slate-700 dark:text-slate-200 hover:border-[#17B5E8]/50 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Salin Tautan
                </button>
              </div>
              <button
                type="button"
                onClick={() => setReadingArticle(null)}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-[#0284C7] to-[#17B5E8] text-white text-xs font-semibold transition-all duration-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
