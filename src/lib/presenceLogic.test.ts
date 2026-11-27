import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRESENCE_TIMEOUT_MS,
  applyOptimisticAddMember,
  applyOptimisticRemoveMember,
  applyOptimisticRoleUpdate,
  canManageCrewMembers,
  countFreshSessions,
  createMemberIdFromEmail,
  enrichCrewMembersWithPresence,
  formatLastSeenID,
  generateCrewInviteCode,
  getAvatarInitials,
  getAvatarStatusLabel,
  getDeterministicAvatarColor,
  groupAndFilterCrewMembers,
  isEffectivelyOnline,
  shouldWriteThrottledHeartbeat,
  sortCrewMembers,
  summarizeCrewPresence,
  validateNewCrewInput,
  validateNewMemberInput,
  type CrewInfo,
  type CrewMemberRecord,
  type PresenceRecord,
} from './presenceLogic';

test('deterministic avatar color and initials remain stable for same input', () => {
  const c1 = getDeterministicAvatarColor('Alya Pratiwi');
  const c2 = getDeterministicAvatarColor('alya pratiwi ');
  assert.equal(c1, c2);
  assert.equal(getAvatarInitials('Alya Pratiwi'), 'AP');
  assert.equal(getAvatarInitials('Budi'), 'BU');
  assert.equal(getAvatarInitials(''), 'PR');
});

test('multi-tab session aggregation keeps user online while >= 1 session is fresh', () => {
  const now = 1_000_000;
  const freshCount = countFreshSessions(
    [
      { lastHeartbeatMs: now - 10_000 }, // tab 1 fresh
      { lastHeartbeatMs: now - 90_000 }, // tab 2 stale (> 75s)
      { lastHeartbeatMs: now - 40_000 }, // tab 3 fresh
    ],
    now,
    PRESENCE_TIMEOUT_MS
  );
  assert.equal(freshCount, 2);

  const onlinePresence: PresenceRecord = {
    uid: 'u1',
    online: true,
    hideOnlineStatus: false,
    lastHeartbeatMs: now - 20_000,
    activeSessionCount: 1,
    lastSeenMs: now - 20_000,
  };
  assert.equal(isEffectivelyOnline(onlinePresence, now), true);

  // Stale heartbeat auto-transitions to offline
  const stalePresence: PresenceRecord = {
    ...onlinePresence,
    lastHeartbeatMs: now - PRESENCE_TIMEOUT_MS - 1_000,
  };
  assert.equal(isEffectivelyOnline(stalePresence, now), false);

  // Privacy toggle forces offline appearance
  const hiddenPresence: PresenceRecord = {
    ...onlinePresence,
    hideOnlineStatus: true,
  };
  assert.equal(isEffectivelyOnline(hiddenPresence, now), false);
});

test('heartbeat throttling avoids excessive writes', () => {
  assert.equal(shouldWriteThrottledHeartbeat(0, 10_000), true);
  assert.equal(shouldWriteThrottledHeartbeat(10_000, 20_000, false, 25_000), false);
  assert.equal(shouldWriteThrottledHeartbeat(10_000, 36_000, false, 25_000), true);
  assert.equal(shouldWriteThrottledHeartbeat(10_000, 12_000, true, 25_000), true);
});

test('Indonesian relative last_seen formatting and accessible labels', () => {
  const now = 1_760_000_000_000;
  assert.equal(formatLastSeenID(null, now), 'Belum pernah aktif');
  assert.equal(formatLastSeenID(now - 20_000, now), 'Terakhir aktif baru saja');
  assert.equal(formatLastSeenID(now - 5 * 60_000, now), 'Terakhir aktif 5 menit lalu');
  assert.equal(formatLastSeenID(now - 3 * 3600_000, now), 'Terakhir aktif 3 jam lalu');
  assert.equal(formatLastSeenID(now - 2 * 86_400_000, now), 'Terakhir aktif 2 hari lalu');

  const onLabel = getAvatarStatusLabel(true, now, now, 'Rani');
  assert.equal(onLabel.statusText, 'Online');
  assert.match(onLabel.ariaLabel, /Rani — Online/);

  const offLabel = getAvatarStatusLabel(false, now - 12 * 60_000, now, 'Rani');
  assert.equal(offLabel.statusText, 'Offline');
  assert.match(offLabel.tooltip, /Terakhir aktif 12 menit lalu/);
});

test('crew sorting places online members first and offline sorted by most recent lastSeen', () => {
  const now = 5_000_000;
  const baseMember = (uid: string, name: string, crewRole: 'owner' | 'admin' | 'member'): CrewMemberRecord => ({
    uid,
    crewId: 'crew_1',
    crewName: 'Tim PR Utama',
    name,
    email: `${uid}@prflow.id`,
    photoURL: '',
    crewRole,
    agencyRole: 'Strategist',
    addedBy: 'u1',
    inviteCode: '',
    joinedAtMs: now - 100_000,
    updatedAtMs: now - 100_000,
  });

  const members: CrewMemberRecord[] = [
    baseMember('u_off_old', 'Citra', 'member'),
    baseMember('u_on_member', 'Budi', 'member'),
    baseMember('u_off_recent', 'Dina', 'admin'),
    baseMember('u_on_owner', 'Alya', 'owner'),
  ];

  const presenceMap: Record<string, PresenceRecord> = {
    u_on_owner: { uid: 'u_on_owner', online: true, hideOnlineStatus: false, lastHeartbeatMs: now - 5_000, activeSessionCount: 1, lastSeenMs: now - 5_000 },
    u_on_member: { uid: 'u_on_member', online: true, hideOnlineStatus: false, lastHeartbeatMs: now - 10_000, activeSessionCount: 2, lastSeenMs: now - 10_000 },
    u_off_recent: { uid: 'u_off_recent', online: false, hideOnlineStatus: false, lastHeartbeatMs: now - 120_000, activeSessionCount: 0, lastSeenMs: now - 120_000 },
    u_off_old: { uid: 'u_off_old', online: false, hideOnlineStatus: false, lastHeartbeatMs: now - 900_000, activeSessionCount: 0, lastSeenMs: now - 900_000 },
  };

  const enriched = enrichCrewMembersWithPresence(members, presenceMap, now);
  const sorted = sortCrewMembers(enriched);
  assert.deepEqual(
    sorted.map((m) => m.uid),
    ['u_on_owner', 'u_on_member', 'u_off_recent', 'u_off_old']
  );

  const summary = summarizeCrewPresence(enriched);
  assert.deepEqual(summary, { onlineUnique: 2, totalUnique: 4 });

  const crews: CrewInfo[] = [
    { id: 'crew_1', name: 'Tim PR Utama', description: 'Tim inti', inviteCode: 'PR-ABC123', ownerUid: 'u_on_owner', myRole: 'owner' },
  ];

  const onlineOnly = groupAndFilterCrewMembers(crews, enriched, {
    status: 'online',
    searchQuery: '',
    crewId: 'ALL',
  });
  assert.equal(onlineOnly[0].members.length, 2);

  const searchDina = groupAndFilterCrewMembers(crews, enriched, {
    status: 'all',
    searchQuery: 'dina',
    crewId: 'ALL',
  });
  assert.equal(searchDina[0].members.length, 1);
  assert.equal(searchDina[0].members[0].uid, 'u_off_recent');
});

test('optimistic add, role update, and remove helpers support clean state updates', () => {
  const initial: CrewMemberRecord[] = [];
  const added = applyOptimisticAddMember(initial, {
    uid: 'u2',
    crewId: 'c1',
    crewName: 'Kru Video',
    name: 'Fajar',
    email: 'fajar@agensi.id',
    photoURL: '',
    crewRole: 'member',
    agencyRole: 'Videographer',
    addedBy: 'u1',
    inviteCode: '',
    joinedAtMs: 1,
    updatedAtMs: 1,
  });
  assert.equal(added.length, 1);
  assert.equal(added[0].isOptimistic, true);

  const promoted = applyOptimisticRoleUpdate(added, 'c1', 'u2', 'admin');
  assert.equal(promoted[0].crewRole, 'admin');

  const removed = applyOptimisticRemoveMember(promoted, 'c1', 'u2');
  assert.equal(removed.length, 0);
});

test('role permissions and blueprint validators enforce strict boundaries', () => {
  assert.equal(canManageCrewMembers('owner'), true);
  assert.equal(canManageCrewMembers('admin'), true);
  assert.equal(canManageCrewMembers('member'), false);

  assert.ok(validateNewCrewInput({ name: '   ', description: '' }).error);
  assert.equal(validateNewCrewInput({ name: 'Tim Krisis', description: 'Siaga 24/7' }).error, undefined);

  assert.ok(validateNewMemberInput({ name: 'Raka', email: 'invalid-email', agencyRole: 'PR', crewRole: 'member' }).error);
  const validMem = validateNewMemberInput({
    name: 'Raka Pratama',
    email: 'RAKA@Agensi.ID',
    agencyRole: 'Media Lead',
    crewRole: 'admin',
  });
  assert.equal(validMem.error, undefined);
  assert.equal(validMem.email, 'raka@agensi.id');

  const code = generateCrewInviteCode();
  assert.match(code, /^PR-[A-Z0-9]{6}$/);

  const memId = createMemberIdFromEmail('raka@agensi.id');
  assert.match(memId, /^[a-zA-Z0-9_-]+$/);
});
