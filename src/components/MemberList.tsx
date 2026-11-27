import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Check,
  Cloud,
  CloudOff,
  Copy,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  canManageCrewMembers,
  enrichCrewMembersWithPresence,
  groupAndFilterCrewMembers,
  summarizeCrewPresence,
  type ConnectionSyncState,
  type CrewInfo,
  type CrewMemberRecord,
  type CrewRole,
  type EnrichedCrewMember,
  type PresenceFilterStatus,
  type PresenceRecord,
} from '../lib/presenceLogic';
import type { RevokedCrewNotice } from '../hooks/useCrewMembers';
import type { AgencySession, TeamUser } from '../types/prflow';
import { MemberCard } from './MemberCard';
import { UserAvatar } from './UserAvatar';

export interface MemberListProps {
  session: AgencySession | null;
  localUsers: TeamUser[];
  cloudUser: FirebaseUser | null;
  signingIn: boolean;
  loadingCrews: boolean;
  connectionState: ConnectionSyncState;
  crews: CrewInfo[];
  members: CrewMemberRecord[];
  presenceMap: Record<string, PresenceRecord>;
  nowMs: number;
  hideOnlineStatus: boolean;
  revokedNotices: RevokedCrewNotice[];
  onDismissRevokedNotice: (crewId: string) => void;
  onSignInGoogle: () => Promise<void>;
  onSignOutGoogle: () => Promise<void>;
  onCreateCrew: (input: { name: string; description: string }) => Promise<{ error?: string; crewId?: string }>;
  onJoinCrewByCode: (code: string) => Promise<{ error?: string; crewName?: string }>;
  onAddCrewMember: (
    crewId: string,
    input: {
      name: string;
      email: string;
      agencyRole: string;
      crewRole: CrewRole;
      photoURL?: string;
    }
  ) => Promise<{ error?: string }>;
  onUpdateMemberRole: (crewId: string, memberUid: string, nextRole: CrewRole) => Promise<{ error?: string }>;
  onConfirmRemoveMember: (member: EnrichedCrewMember) => void;
  onConfirmDeleteLocalUser?: (id: string, name: string) => void;
  onOpenLocalUserModal: () => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  session,
  localUsers,
  cloudUser,
  signingIn,
  loadingCrews,
  connectionState,
  crews,
  members,
  presenceMap,
  nowMs,
  hideOnlineStatus,
  revokedNotices,
  onDismissRevokedNotice,
  onSignInGoogle,
  onSignOutGoogle,
  onCreateCrew,
  onJoinCrewByCode,
  onAddCrewMember,
  onUpdateMemberRole,
  onConfirmRemoveMember,
  onConfirmDeleteLocalUser,
  onOpenLocalUserModal,
}) => {
  const [statusFilter, setStatusFilter] = useState<PresenceFilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrewId, setSelectedCrewId] = useState<string>('ALL');
  const [copiedCrewId, setCopiedCrewId] = useState<string | null>(null);

  // Modals
  const [createCrewOpen, setCreateCrewOpen] = useState(false);
  const [joinCrewOpen, setJoinCrewOpen] = useState(false);
  const [addMemberCrewId, setAddMemberCrewId] = useState<string | null>(null);

  // Create Crew Form
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewDesc, setNewCrewDesc] = useState('');
  const [crewFormError, setCrewFormError] = useState('');
  const [submittingCrew, setSubmittingCrew] = useState(false);

  // Join Crew Form
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joiningCrew, setJoiningCrew] = useState(false);

  // Add Member Form
  const [memName, setMemName] = useState('');
  const [memEmail, setMemEmail] = useState('');
  const [memAgencyRole, setMemAgencyRole] = useState('Content Strategist');
  const [memCrewRole, setMemCrewRole] = useState<CrewRole>('member');
  const [memError, setMemError] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  // Fallback local view when Google Cloud Sync is not yet activated:
  // displays current workspace account + locally added TeamUsers with live local presence.
  const effectiveCrewsAndMembers = useMemo(() => {
    if (cloudUser) {
      const enriched = enrichCrewMembersWithPresence(members, presenceMap, nowMs);
      return {
        crews,
        enrichedMembers: enriched,
        currentUid: cloudUser.uid,
      };
    }

    const localCrewId = session?.workspaceId || 'workspace_lokal';
    const localCrewName = session?.workspaceId
      ? `Kru ${session.workspaceId}`
      : 'Kru Workspace Lokal';
    const localOwnerUid = session?.email ? `local_${session.email.toLowerCase()}` : 'local_owner';

    const localCrewList: CrewInfo[] = [
      {
        id: localCrewId,
        name: localCrewName,
        description: 'Direktori kru workspace saat ini. Aktifkan Sinkronisasi Real-Time (Google) untuk kolaborasi lintas perangkat.',
        inviteCode: '',
        ownerUid: localOwnerUid,
        myRole: 'owner',
      },
    ];

    const localMemberRecords: CrewMemberRecord[] = [];
    if (session) {
      localMemberRecords.push({
        uid: localOwnerUid,
        crewId: localCrewId,
        crewName: localCrewName,
        name: session.name,
        email: session.email,
        photoURL: '',
        crewRole: 'owner',
        agencyRole: session.role,
        addedBy: localOwnerUid,
        inviteCode: '',
        joinedAtMs: Date.parse(session.loginAt) || nowMs,
        updatedAtMs: nowMs,
      });
    }
    for (const u of localUsers) {
      if (session && u.email.toLowerCase() === session.email.toLowerCase()) continue;
      localMemberRecords.push({
        uid: u.id,
        crewId: localCrewId,
        crewName: localCrewName,
        name: u.name,
        email: u.email,
        photoURL: '',
        crewRole: 'member',
        agencyRole: u.role,
        addedBy: localOwnerUid,
        inviteCode: '',
        joinedAtMs: nowMs,
        updatedAtMs: nowMs,
      });
    }

    const enriched = enrichCrewMembersWithPresence(localMemberRecords, presenceMap, nowMs);
    return {
      crews: localCrewList,
      enrichedMembers: enriched,
      currentUid: localOwnerUid,
    };
  }, [cloudUser, crews, members, presenceMap, nowMs, session, localUsers]);

  const summary = useMemo(
    () => summarizeCrewPresence(effectiveCrewsAndMembers.enrichedMembers),
    [effectiveCrewsAndMembers.enrichedMembers]
  );

  const offlineUnique = Math.max(0, summary.totalUnique - summary.onlineUnique);

  const groupedCrews = useMemo(
    () =>
      groupAndFilterCrewMembers(
        effectiveCrewsAndMembers.crews,
        effectiveCrewsAndMembers.enrichedMembers,
        {
          status: statusFilter,
          searchQuery,
          crewId: selectedCrewId,
        }
      ),
    [effectiveCrewsAndMembers, statusFilter, searchQuery, selectedCrewId]
  );

  const manageableCrews = useMemo(
    () => effectiveCrewsAndMembers.crews.filter((c) => canManageCrewMembers(c.myRole)),
    [effectiveCrewsAndMembers.crews]
  );

  const handleCopyInviteCode = async (crewId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCrewId(crewId);
      window.setTimeout(() => setCopiedCrewId((curr) => (curr === crewId ? null : curr)), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleSubmitCreateCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrewFormError('');
    setSubmittingCrew(true);
    try {
      const res = await onCreateCrew({ name: newCrewName, description: newCrewDesc });
      if (res.error) {
        setCrewFormError(res.error);
        return;
      }
      setNewCrewName('');
      setNewCrewDesc('');
      setCreateCrewOpen(false);
    } finally {
      setSubmittingCrew(false);
    }
  };

  const handleSubmitJoinCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    setJoiningCrew(true);
    try {
      const res = await onJoinCrewByCode(joinCode);
      if (res.error) {
        setJoinError(res.error);
        return;
      }
      setJoinCode('');
      setJoinCrewOpen(false);
    } finally {
      setJoiningCrew(false);
    }
  };

  const handleSubmitAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMemberCrewId) return;
    setMemError('');
    setAddingMember(true);
    try {
      const res = await onAddCrewMember(addMemberCrewId, {
        name: memName,
        email: memEmail,
        agencyRole: memAgencyRole,
        crewRole: memCrewRole,
      });
      if (res.error) {
        setMemError(res.error);
        return;
      }
      setMemName('');
      setMemEmail('');
      setMemAgencyRole('Content Strategist');
      setMemCrewRole('member');
      setAddMemberCrewId(null);
    } finally {
      setAddingMember(false);
    }
  };

  const renderConnectionBadge = () => {
    if (connectionState === 'synced') {
      return (
        <span
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/14 text-emerald-700 dark:text-emerald-300 border border-emerald-400/35"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
          Tersinkron
        </span>
      );
    }
    if (connectionState === 'reconnecting') {
      return (
        <span
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/14 text-amber-800 dark:text-amber-300 border border-amber-400/35"
        >
          <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" />
          Menyambung ulang...
        </span>
      );
    }
    return (
      <span
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold glass-subtle text-slate-600 dark:text-slate-300"
      >
        <CloudOff className="w-3 h-3 text-slate-500 dark:text-slate-400" aria-hidden="true" />
        Mode Lokal
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-view">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-[#0284C7] dark:text-[#2CE59B]">
              Presence &amp; Sinkronisasi Real-Time
            </span>
            {renderConnectionBadge()}
          </div>
          <h1 className="font-display text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-white">
            Anggota Kru
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <strong className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {summary.onlineUnique} anggota online
            </strong>{' '}
            dari{' '}
            <strong className="font-semibold text-slate-900 dark:text-white tabular-nums">
              {summary.totalUnique} total
            </strong>
            {hideOnlineStatus && (
              <span className="ml-2 text-xs text-amber-700 dark:text-amber-300 font-medium">
                (Mode Privasi: status online Anda disembunyikan)
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {cloudUser ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setCrewFormError('');
                  setCreateCrewOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 text-white text-xs font-semibold shadow-md shadow-[#17B5E8]/25 transition-all whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Buat Kru Baru
              </button>
              <button
                type="button"
                onClick={() => {
                  setJoinError('');
                  setJoinCrewOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full glass-subtle hover:bg-white/90 dark:hover:bg-white/10 text-slate-800 dark:text-slate-100 text-xs font-semibold transition-all whitespace-nowrap"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#38BDF8]" aria-hidden="true" />
                Gabung via Kode
              </button>
              {manageableCrews.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMemError('');
                    setAddMemberCrewId(manageableCrews[0].id);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full glass-subtle hover:border-[#2CE59B]/60 text-slate-800 dark:text-slate-100 text-xs font-semibold transition-all whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#059669] dark:text-[#2CE59B]" aria-hidden="true" />
                  Tambah Anggota
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenLocalUserModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full glass-subtle hover:bg-white/90 dark:hover:bg-white/10 text-slate-800 dark:text-slate-100 text-xs font-semibold transition-all whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#38BDF8]" aria-hidden="true" />
              Tambah Kru Lokal
            </button>
          )}
        </div>
      </div>

      {/* Immediate Access Revocation Alerts */}
      {revokedNotices.length > 0 && (
        <div className="space-y-2.5" role="alert">
          {revokedNotices.map((notice) => (
            <div
              key={notice.crewId}
              className="p-4 rounded-2xl bg-rose-500/12 dark:bg-rose-500/18 border border-rose-400/50 dark:border-rose-500/35 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-sm text-rose-900 dark:text-rose-200">
                    Akses ke Kru &ldquo;{notice.crewName}&rdquo; Dicabut ({notice.revokedAt})
                  </h2>
                  <p className="text-xs text-rose-800/90 dark:text-rose-200/85 mt-0.5 leading-relaxed">
                    Admin kru telah menghapus keanggotaan Anda. Aturan keamanan server langsung memblokir akses data kru tersebut secara real-time. Hubungi Admin atau Owner kru jika Anda memerlukan undangan ulang.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDismissRevokedNotice(notice.crewId)}
                aria-label={`Tutup pemberitahuan pencabutan akses ${notice.crewName}`}
                className="p-1.5 rounded-xl text-rose-600 dark:text-rose-300 hover:bg-rose-500/15 transition-colors shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Cloud Account Status Strip */}
      {cloudUser ? (
        <section className="p-4 rounded-[24px] glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              user={{
                name: cloudUser.displayName || cloudUser.email || 'Pengguna',
                email: cloudUser.email || undefined,
                photoURL: cloudUser.photoURL,
                isOnline: !hideOnlineStatus && connectionState !== 'reconnecting',
                lastSeenMs: nowMs,
              }}
              size="md"
              showStatus
              nowMs={nowMs}
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#0284C7] dark:text-[#2CE59B]">
                Terhubung ke Firebase Real-Time Presence
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {cloudUser.displayName || cloudUser.email}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {cloudUser.email} · Heartbeat otomatis 30d &amp; dukungan multi-tab aktif
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void onSignOutGoogle()}
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full glass-subtle hover:bg-rose-500/12 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-300 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Putuskan Cloud (Offline)
          </button>
        </section>
      ) : (
        <section className="p-5 rounded-[26px] glass-card flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0284C7] via-[#17B5E8] to-[#2CE59B] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#17B5E8]/25">
              <Cloud className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                Sinkronisasi Presence &amp; Keanggotaan Kru Lintas Perangkat
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-2xl">
                Saat ini tampilan menggunakan sesi lokal browser. Hubungkan akun Google Anda untuk mengaktifkan status Online/Offline real-time lintas perangkat, undangan kode kru, dan penegakan hak akses server Firebase secara instan.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={signingIn}
            onClick={() => void onSignInGoogle()}
            className="self-start md:self-center inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 disabled:opacity-60 text-white text-xs font-semibold shadow-md shadow-[#17B5E8]/25 transition-all whitespace-nowrap shrink-0"
          >
            <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
            {signingIn ? 'Menghubungkan...' : 'Masuk Google Cloud Sync'}
          </button>
        </section>
      )}

      {/* Filters Toolbar */}
      <section className="p-4 rounded-[24px] glass-card flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Status Segmented Filter */}
        <div
          role="group"
          aria-label="Filter status kehadiran anggota kru"
          className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-900/[0.05] dark:bg-white/[0.06] self-start"
        >
          {(
            [
              { id: 'all', label: `Semua (${summary.totalUnique})` },
              { id: 'online', label: `Online (${summary.onlineUnique})` },
              { id: 'offline', label: `Offline (${offlineUnique})` },
            ] as const
          ).map((item) => {
            const active = statusFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(item.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17B5E8] ${
                  active
                    ? 'bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Search + Crew Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 lg:max-w-xl lg:justify-end">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="crew-member-search" className="sr-only">
              Cari anggota kru berdasarkan nama atau email
            </label>
            <input
              id="crew-member-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau email anggota..."
              className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="sm:w-52 shrink-0">
            <label htmlFor="crew-group-filter" className="sr-only">
              Filter berdasarkan kru
            </label>
            <select
              id="crew-group-filter"
              value={selectedCrewId}
              onChange={(e) => setSelectedCrewId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-2xl glass-input text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Semua Kru ({effectiveCrewsAndMembers.crews.length})</option>
              {effectiveCrewsAndMembers.crews.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Initial Loading Skeletons */}
      {cloudUser && loadingCrews ? (
        <div className="space-y-4" aria-busy="true" aria-label="Memuat daftar anggota kru">
          {[1, 2].map((s) => (
            <div key={s} className="p-6 rounded-[28px] glass-card space-y-4 animate-pulse">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-44 rounded-lg bg-slate-300/60 dark:bg-slate-700/60" />
                  <div className="h-3 w-64 rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
                </div>
                <div className="h-8 w-28 rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((r) => (
                  <div
                    key={r}
                    className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 flex items-center gap-3.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-300/70 dark:bg-slate-700/70 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-36 rounded bg-slate-300/70 dark:bg-slate-700/70" />
                      <div className="h-3 w-52 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : groupedCrews.length === 0 ? (
        /* Empty State when User Has No Crews Yet */
        <section className="p-10 rounded-[28px] glass-card text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#0284C7]/15 via-[#17B5E8]/15 to-[#2CE59B]/20 text-[#0284C7] dark:text-[#2CE59B] flex items-center justify-center">
            <Users className="w-7 h-7" aria-hidden="true" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Belum Ada Kru Real-Time
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Buat kru PR pertama Anda untuk mengundang anggota tim dan memantau status kehadiran online/offline secara langsung, atau masukkan kode kru dari admin tim Anda.
            </p>
          </div>
          {cloudUser && (
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCrewFormError('');
                  setCreateCrewOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] text-white text-xs font-semibold shadow-md shadow-[#17B5E8]/25 hover:brightness-105 transition-all"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Buat Kru Pertama
              </button>
              <button
                type="button"
                onClick={() => {
                  setJoinError('');
                  setJoinCrewOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full glass-subtle text-slate-800 dark:text-slate-100 text-xs font-semibold hover:bg-white/90 dark:hover:bg-white/10 transition-all"
              >
                <KeyRound className="w-4 h-4 text-[#0284C7] dark:text-[#38BDF8]" aria-hidden="true" />
                Gabung via Kode Kru
              </button>
            </div>
          )}
        </section>
      ) : (
        /* Grouped Crew Sections */
        <div className="space-y-5">
          {groupedCrews.map((group) => {
            const canManageThisCrew = Boolean(cloudUser) && canManageCrewMembers(group.myRole);
            const isCopied = copiedCrewId === group.crewId;

            return (
              <section
                key={group.crewId}
                aria-label={`Kru ${group.crewName}`}
                className="p-5 sm:p-6 rounded-[28px] glass-card space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-900/10 dark:border-white/10">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                        {group.crewName}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 tabular-nums">
                        {group.onlineCount} online · {group.totalCount} anggota
                      </span>
                    </div>
                    {group.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {group.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {group.inviteCode && (
                      <button
                        type="button"
                        onClick={() => void handleCopyInviteCode(group.crewId, group.inviteCode)}
                        title="Salin kode undangan kru untuk dibagikan ke anggota lain"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-subtle hover:border-[#17B5E8]/50 text-xs font-mono font-semibold text-[#0284C7] dark:text-[#2CE59B] transition-colors"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                            Disalin: {group.inviteCode}
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            Kode: {group.inviteCode}
                          </>
                        )}
                      </button>
                    )}

                    {canManageThisCrew && (
                      <button
                        type="button"
                        onClick={() => {
                          setMemError('');
                          setAddMemberCrewId(group.crewId);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] hover:brightness-105 text-white text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
                      >
                        <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                        Tambah Anggota
                      </button>
                    )}
                  </div>
                </div>

                {group.members.length === 0 ? (
                  <div className="py-8 px-4 rounded-2xl border border-dashed border-slate-300/80 dark:border-slate-700 text-center space-y-1">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {group.totalCount === 0
                        ? 'Belum ada anggota di kru ini'
                        : 'Tidak ada anggota yang cocok dengan filter'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {group.totalCount === 0
                        ? 'Tambahkan anggota kru atau bagikan kode kru agar tim dapat bergabung.'
                        : 'Coba ubah filter status atau kata kunci pencarian nama/email.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <AnimatePresence initial={false}>
                      {group.members.map((member) => {
                        const canRemoveLocal =
                          !cloudUser &&
                          Boolean(onConfirmDeleteLocalUser) &&
                          member.uid !== effectiveCrewsAndMembers.currentUid;
                        return (
                          <MemberCard
                            key={`${member.crewId}:${member.uid}`}
                            member={member}
                            nowMs={nowMs}
                            isCurrentUser={member.uid === effectiveCrewsAndMembers.currentUid}
                            canManage={canManageThisCrew || canRemoveLocal}
                            onChangeRole={
                              canManageThisCrew
                                ? (cid, uid, role) => void onUpdateMemberRole(cid, uid, role)
                                : undefined
                            }
                            onRequestRemove={
                              canManageThisCrew
                                ? onConfirmRemoveMember
                                : canRemoveLocal && onConfirmDeleteLocalUser
                                  ? (m) => onConfirmDeleteLocalUser(m.uid, m.name)
                                  : undefined
                            }
                          />
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Modal 1: Buat Kru Baru */}
      {createCrewOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-create-crew-title"
            className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-md flex items-center justify-center p-4"
          >
            <form
              onSubmit={(e) => void handleSubmitCreateCrew(e)}
              className="w-full max-w-md p-6 rounded-[28px] glass-panel space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2
                  id="modal-create-crew-title"
                  className="font-display font-bold text-lg text-slate-900 dark:text-white"
                >
                  Buat Kru PR Baru
                </h2>
                <button
                  type="button"
                  onClick={() => setCreateCrewOpen(false)}
                  aria-label="Tutup modal buat kru"
                  className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {crewFormError && (
                <div className="p-3 rounded-2xl bg-rose-500/12 border border-rose-400/40 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {crewFormError}
                </div>
              )}

              <div>
                <label
                  htmlFor="new-crew-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Nama Kru / Tim
                </label>
                <input
                  id="new-crew-name"
                  type="text"
                  required
                  maxLength={80}
                  value={newCrewName}
                  onChange={(e) => setNewCrewName(e.target.value)}
                  placeholder="Contoh: Tim Produksi Video & PR Krisis"
                  className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="new-crew-desc"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Deskripsi Singkat (Opsional)
                </label>
                <textarea
                  id="new-crew-desc"
                  rows={2}
                  maxLength={240}
                  value={newCrewDesc}
                  onChange={(e) => setNewCrewDesc(e.target.value)}
                  placeholder="Fokus kampanye, liputan media, atau divisi produksi..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateCrewOpen(false)}
                  className="px-4 py-2 rounded-full glass-subtle text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingCrew}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] text-white text-xs font-semibold shadow-md shadow-[#17B5E8]/25 disabled:opacity-60"
                >
                  {submittingCrew ? 'Membuat...' : 'Buat Kru'}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* Modal 2: Gabung Kru via Kode */}
      {joinCrewOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-join-crew-title"
            className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-md flex items-center justify-center p-4"
          >
            <form
              onSubmit={(e) => void handleSubmitJoinCrew(e)}
              className="w-full max-w-md p-6 rounded-[28px] glass-panel space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2
                  id="modal-join-crew-title"
                  className="font-display font-bold text-lg text-slate-900 dark:text-white"
                >
                  Gabung ke Kru via Kode
                </h2>
                <button
                  type="button"
                  onClick={() => setJoinCrewOpen(false)}
                  aria-label="Tutup modal gabung kru"
                  className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {joinError && (
                <div className="p-3 rounded-2xl bg-rose-500/12 border border-rose-400/40 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {joinError}
                </div>
              )}

              <div>
                <label
                  htmlFor="join-crew-code"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Kode Undangan Kru
                </label>
                <input
                  id="join-crew-code"
                  type="text"
                  required
                  maxLength={24}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: PR-8K4M2P"
                  className="w-full px-3.5 py-2.5 text-sm font-mono uppercase tracking-wider rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                  Minta kode kru dari Owner atau Admin kru Anda. Setelah bergabung, kehadiran Anda langsung tersinkron ke layar seluruh anggota.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setJoinCrewOpen(false)}
                  className="px-4 py-2 rounded-full glass-subtle text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={joiningCrew}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] text-white text-xs font-semibold shadow-md shadow-[#17B5E8]/25 disabled:opacity-60"
                >
                  {joiningCrew ? 'Bergabung...' : 'Gabung Kru'}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* Modal 3: Tambah Anggota Kru (Owner / Admin only) */}
      {addMemberCrewId &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-add-member-title"
            className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-md flex items-center justify-center p-4"
          >
            <form
              onSubmit={(e) => void handleSubmitAddMember(e)}
              className="w-full max-w-md p-6 rounded-[28px] glass-panel space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2
                  id="modal-add-member-title"
                  className="font-display font-bold text-lg text-slate-900 dark:text-white"
                >
                  Tambah Anggota Kru
                </h2>
                <button
                  type="button"
                  onClick={() => setAddMemberCrewId(null)}
                  aria-label="Tutup modal tambah anggota"
                  className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {memError && (
                <div className="p-3 rounded-2xl bg-rose-500/12 border border-rose-400/40 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {memError}
                </div>
              )}

              <div>
                <label
                  htmlFor="add-mem-crew"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Pilih Kru
                </label>
                <select
                  id="add-mem-crew"
                  value={addMemberCrewId}
                  onChange={(e) => setAddMemberCrewId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
                >
                  {manageableCrews.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="add-mem-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Nama Lengkap
                </label>
                <input
                  id="add-mem-name"
                  type="text"
                  required
                  maxLength={80}
                  value={memName}
                  onChange={(e) => setMemName(e.target.value)}
                  placeholder="Contoh: Nadia Kusuma"
                  className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="add-mem-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Email Anggota
                </label>
                <input
                  id="add-mem-email"
                  type="email"
                  required
                  maxLength={160}
                  value={memEmail}
                  onChange={(e) => setMemEmail(e.target.value)}
                  placeholder="nadia@agensi.id"
                  className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="add-mem-agency-role"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                  >
                    Jabatan PR
                  </label>
                  <input
                    id="add-mem-agency-role"
                    type="text"
                    required
                    maxLength={60}
                    value={memAgencyRole}
                    onChange={(e) => setMemAgencyRole(e.target.value)}
                    placeholder="Media Relations"
                    className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="add-mem-crew-role"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                  >
                    Hak Akses Kru
                  </label>
                  <select
                    id="add-mem-crew-role"
                    value={memCrewRole}
                    onChange={(e) => setMemCrewRole(e.target.value as CrewRole)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-2xl glass-input text-slate-900 dark:text-white outline-none"
                  >
                    <option value="member">Anggota</option>
                    <option value="admin">Admin Kru</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddMemberCrewId(null)}
                  className="px-4 py-2 rounded-full glass-subtle text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-[#0284C7] via-[#17B5E8] to-[#0EA5A4] text-white text-xs font-semibold shadow-md shadow-[#17B5E8]/25 disabled:opacity-60"
                >
                  {addingMember ? 'Menyimpan...' : 'Tambahkan ke Kru'}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </div>
  );
};
