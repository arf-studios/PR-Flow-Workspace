export type CrewRole = 'owner' | 'admin' | 'member';
export type PresenceFilterStatus = 'all' | 'online' | 'offline';
export type ConnectionSyncState = 'synced' | 'reconnecting' | 'local';

export const HEARTBEAT_INTERVAL_MS = 30_000;
export const PRESENCE_TIMEOUT_MS = 75_000;
export const LAST_SEEN_THROTTLE_MS = 25_000;
export const MAX_SESSIONS_PER_USER = 25;

// Blueprint boundary constants synchronized with firebase-blueprint.json & firestore.rules
export const BLUEPRINT_LIMITS = {
  idMax: 128,
  idPattern: /^[a-zA-Z0-9_-]+$/,
  inviteCodeMin: 4,
  inviteCodeMax: 24,
  inviteCodePattern: /^[A-Z0-9_-]+$/,
  nameMin: 1,
  nameMax: 80,
  emailMin: 3,
  emailMax: 160,
  emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  photoUrlMax: 500,
  agencyRoleMin: 1,
  agencyRoleMax: 60,
  crewNameMin: 1,
  crewNameMax: 80,
  crewDescMax: 240,
  deviceLabelMax: 80,
} as const;

export interface PresenceRecord {
  uid: string;
  online: boolean;
  hideOnlineStatus: boolean;
  lastHeartbeatMs: number;
  activeSessionCount: number;
  lastSeenMs: number | null;
}

export interface CrewInfo {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  ownerUid: string;
  myRole: CrewRole;
}

export interface CrewMemberRecord {
  uid: string;
  crewId: string;
  crewName: string;
  name: string;
  email: string;
  photoURL: string;
  crewRole: CrewRole;
  agencyRole: string;
  addedBy: string;
  inviteCode: string;
  joinedAtMs: number;
  updatedAtMs: number;
  isOptimistic?: boolean;
}

export interface EnrichedCrewMember extends CrewMemberRecord {
  isOnline: boolean;
  hideOnlineStatus: boolean;
  lastSeenMs: number | null;
  activeSessionCount: number;
}

export interface CrewFilterState {
  status: PresenceFilterStatus;
  searchQuery: string;
  crewId: string; // 'ALL' or specific crewId
}

export interface CrewMemberGroup {
  crewId: string;
  crewName: string;
  description: string;
  inviteCode: string;
  myRole: CrewRole;
  members: EnrichedCrewMember[];
  onlineCount: number;
  totalCount: number;
}

const AVATAR_PALETTE = [
  'bg-gradient-to-br from-[#0284C7] to-[#17B5E8]',
  'bg-gradient-to-br from-[#059669] to-[#2CE59B]',
  'bg-gradient-to-br from-[#EA580C] to-[#F37021]',
  'bg-gradient-to-br from-[#0369A1] to-[#0EA5A4]',
  'bg-gradient-to-br from-[#4F46E5] to-[#0EA5E9]',
  'bg-gradient-to-br from-[#0F766E] to-[#10B981]',
  'bg-gradient-to-br from-[#D97706] to-[#F59E0B]',
  'bg-gradient-to-br from-[#2563EB] to-[#38BDF8]',
] as const;

export function getDeterministicAvatarColor(seed: string): string {
  const normalized = (seed || 'prflow').trim().toLowerCase();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = ((hash << 5) + hash + normalized.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function getAvatarInitials(name: string): string {
  const cleaned = (name || '').trim();
  if (!cleaned) return 'PR';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export function countFreshSessions(
  sessions: ReadonlyArray<{ lastHeartbeatMs: number }>,
  nowMs: number,
  timeoutMs: number = PRESENCE_TIMEOUT_MS
): number {
  let count = 0;
  for (const s of sessions) {
    if (
      typeof s.lastHeartbeatMs === 'number' &&
      Number.isFinite(s.lastHeartbeatMs) &&
      nowMs - s.lastHeartbeatMs <= timeoutMs
    ) {
      count += 1;
    }
  }
  return Math.min(count, MAX_SESSIONS_PER_USER);
}

export function isEffectivelyOnline(
  presence: PresenceRecord | null | undefined,
  nowMs: number,
  timeoutMs: number = PRESENCE_TIMEOUT_MS
): boolean {
  if (!presence) return false;
  if (presence.hideOnlineStatus) return false;
  if (!presence.online) return false;
  if (presence.activeSessionCount <= 0) return false;
  if (typeof presence.lastHeartbeatMs !== 'number' || !Number.isFinite(presence.lastHeartbeatMs)) {
    return false;
  }
  return nowMs - presence.lastHeartbeatMs <= timeoutMs;
}

export function shouldWriteThrottledHeartbeat(
  lastWriteMs: number,
  nowMs: number,
  force: boolean = false,
  throttleMs: number = LAST_SEEN_THROTTLE_MS
): boolean {
  if (force) return true;
  if (lastWriteMs <= 0) return true;
  return nowMs - lastWriteMs >= throttleMs;
}

export function formatLastSeenID(
  lastSeenMs: number | null | undefined,
  nowMs: number
): string {
  if (typeof lastSeenMs !== 'number' || !Number.isFinite(lastSeenMs) || lastSeenMs <= 0) {
    return 'Belum pernah aktif';
  }
  const diffMs = Math.max(0, nowMs - lastSeenMs);
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) {
    return 'Terakhir aktif baru saja';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `Terakhir aktif ${diffMin} menit lalu`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `Terakhir aktif ${diffHours} jam lalu`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `Terakhir aktif ${diffDays} hari lalu`;
}

export function getAvatarStatusLabel(
  isOnline: boolean,
  lastSeenMs: number | null | undefined,
  nowMs: number,
  userName?: string
): { statusText: string; tooltip: string; ariaLabel: string } {
  const prefix = userName ? `${userName} — ` : '';
  if (isOnline) {
    return {
      statusText: 'Online',
      tooltip: `${prefix}Online`,
      ariaLabel: `${prefix}Online`,
    };
  }
  const lastSeenText = formatLastSeenID(lastSeenMs, nowMs);
  return {
    statusText: 'Offline',
    tooltip: `${prefix}Offline · ${lastSeenText}`,
    ariaLabel: `${prefix}Offline, ${lastSeenText}`,
  };
}

const ROLE_PRIORITY: Record<CrewRole, number> = {
  owner: 0,
  admin: 1,
  member: 2,
};

export function sortCrewMembers(
  members: ReadonlyArray<EnrichedCrewMember>
): EnrichedCrewMember[] {
  return [...members].sort((a, b) => {
    if (a.isOnline !== b.isOnline) {
      return a.isOnline ? -1 : 1;
    }
    if (!a.isOnline && !b.isOnline) {
      const aLast = a.lastSeenMs ?? 0;
      const bLast = b.lastSeenMs ?? 0;
      if (aLast !== bLast) {
        return bLast - aLast;
      }
    }
    const roleDiff = ROLE_PRIORITY[a.crewRole] - ROLE_PRIORITY[b.crewRole];
    if (roleDiff !== 0) return roleDiff;
    return a.name.localeCompare(b.name, 'id-ID');
  });
}

export function enrichCrewMembersWithPresence(
  members: ReadonlyArray<CrewMemberRecord>,
  presenceMap: Readonly<Record<string, PresenceRecord>>,
  nowMs: number
): EnrichedCrewMember[] {
  return members.map((m) => {
    const p = presenceMap[m.uid];
    const online = isEffectivelyOnline(p, nowMs);
    return {
      ...m,
      isOnline: online,
      hideOnlineStatus: Boolean(p?.hideOnlineStatus),
      lastSeenMs: p?.lastSeenMs ?? null,
      activeSessionCount: p?.activeSessionCount ?? 0,
    };
  });
}

export function summarizeCrewPresence(
  members: ReadonlyArray<EnrichedCrewMember>
): { onlineUnique: number; totalUnique: number } {
  const byUid = new Map<string, boolean>();
  for (const m of members) {
    const prev = byUid.get(m.uid) || false;
    byUid.set(m.uid, prev || m.isOnline);
  }
  let onlineUnique = 0;
  for (const online of byUid.values()) {
    if (online) onlineUnique += 1;
  }
  return {
    onlineUnique,
    totalUnique: byUid.size,
  };
}

export function groupAndFilterCrewMembers(
  crews: ReadonlyArray<CrewInfo>,
  members: ReadonlyArray<EnrichedCrewMember>,
  filters: CrewFilterState
): CrewMemberGroup[] {
  const q = filters.searchQuery.trim().toLowerCase();

  const matchingCrews =
    filters.crewId === 'ALL'
      ? crews
      : crews.filter((c) => c.id === filters.crewId);

  return matchingCrews.map((crew) => {
    const crewMembers = members.filter((m) => m.crewId === crew.id);
    const onlineCount = crewMembers.filter((m) => m.isOnline).length;
    const totalCount = crewMembers.length;

    const filtered = crewMembers.filter((m) => {
      if (filters.status === 'online' && !m.isOnline) return false;
      if (filters.status === 'offline' && m.isOnline) return false;
      if (q) {
        const hay = `${m.name} ${m.email} ${m.agencyRole} ${m.crewName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return {
      crewId: crew.id,
      crewName: crew.name,
      description: crew.description,
      inviteCode: crew.inviteCode,
      myRole: crew.myRole,
      members: sortCrewMembers(filtered),
      onlineCount,
      totalCount,
    };
  });
}

export function applyOptimisticAddMember(
  existing: ReadonlyArray<CrewMemberRecord>,
  optimisticMember: CrewMemberRecord
): CrewMemberRecord[] {
  const filtered = existing.filter(
    (m) => !(m.crewId === optimisticMember.crewId && m.uid === optimisticMember.uid)
  );
  return [...filtered, { ...optimisticMember, isOptimistic: true }];
}

export function applyOptimisticRemoveMember(
  existing: ReadonlyArray<CrewMemberRecord>,
  crewId: string,
  memberUid: string
): CrewMemberRecord[] {
  return existing.filter((m) => !(m.crewId === crewId && m.uid === memberUid));
}

export function applyOptimisticRoleUpdate(
  existing: ReadonlyArray<CrewMemberRecord>,
  crewId: string,
  memberUid: string,
  nextRole: CrewRole
): CrewMemberRecord[] {
  return existing.map((m) =>
    m.crewId === crewId && m.uid === memberUid
      ? { ...m, crewRole: nextRole, isOptimistic: true }
      : m
  );
}

export function canManageCrewMembers(role: CrewRole | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

export function getCrewRoleLabelID(role: CrewRole): string {
  switch (role) {
    case 'owner':
      return 'Owner Kru';
    case 'admin':
      return 'Admin Kru';
    default:
      return 'Anggota';
  }
}

export function sanitizeId(raw: string, fallbackPrefix = 'id'): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, BLUEPRINT_LIMITS.idMax);
  if (cleaned.length > 0 && BLUEPRINT_LIMITS.idPattern.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}_${Date.now().toString(36)}`;
}

export function generateCrewInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `PR-${suffix}`;
}

export function validateNewCrewInput(input: {
  name: string;
  description: string;
}): { error?: string; name: string; description: string } {
  const name = input.name.trim().slice(0, BLUEPRINT_LIMITS.crewNameMax);
  const description = input.description.trim().slice(0, BLUEPRINT_LIMITS.crewDescMax);
  if (name.length < BLUEPRINT_LIMITS.crewNameMin) {
    return { error: 'Nama kru wajib diisi.', name, description };
  }
  return { name, description };
}

export function validateNewMemberInput(input: {
  name: string;
  email: string;
  agencyRole: string;
  crewRole: CrewRole;
  photoURL?: string;
}): {
  error?: string;
  name: string;
  email: string;
  agencyRole: string;
  crewRole: CrewRole;
  photoURL: string;
} {
  const name = input.name.trim().slice(0, BLUEPRINT_LIMITS.nameMax);
  const email = input.email.trim().toLowerCase().slice(0, BLUEPRINT_LIMITS.emailMax);
  const agencyRole = (input.agencyRole.trim() || 'PR Crew').slice(
    0,
    BLUEPRINT_LIMITS.agencyRoleMax
  );
  const photoURL = (input.photoURL || '').trim().slice(0, BLUEPRINT_LIMITS.photoUrlMax);
  const crewRole: CrewRole =
    input.crewRole === 'admin' || input.crewRole === 'member' ? input.crewRole : 'member';

  if (name.length < BLUEPRINT_LIMITS.nameMin) {
    return { error: 'Nama anggota wajib diisi.', name, email, agencyRole, crewRole, photoURL };
  }
  if (!BLUEPRINT_LIMITS.emailPattern.test(email)) {
    return {
      error: 'Masukkan alamat email yang valid (contoh: nama@agensi.id).',
      name,
      email,
      agencyRole,
      crewRole,
      photoURL,
    };
  }
  return { name, email, agencyRole, crewRole, photoURL };
}

export function createMemberIdFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const slug = normalized
    .split('@')[0]
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 16);
  return `mem_${slug || 'user'}_${hash.toString(36)}`;
}
