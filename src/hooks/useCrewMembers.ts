import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  isPermissionDeniedError,
  OperationType,
} from '../lib/firebase';
import {
  applyOptimisticAddMember,
  applyOptimisticRemoveMember,
  applyOptimisticRoleUpdate,
  BLUEPRINT_LIMITS,
  createMemberIdFromEmail,
  generateCrewInviteCode,
  sanitizeId,
  validateNewCrewInput,
  validateNewMemberInput,
  type CrewInfo,
  type CrewMemberRecord,
  type CrewRole,
} from '../lib/presenceLogic';

export interface RevokedCrewNotice {
  crewId: string;
  crewName: string;
  revokedAt: string;
}

export interface UseCrewMembersParams {
  agencyRoleFallback: string;
  hideOnlineStatus: boolean;
  onNotify?: (type: 'info' | 'success' | 'warning' | 'danger', title: string, message: string) => void;
}

export interface UseCrewMembersResult {
  cloudUser: FirebaseUser | null;
  authReady: boolean;
  signingIn: boolean;
  loadingCrews: boolean;
  crews: CrewInfo[];
  members: CrewMemberRecord[];
  trackedUids: string[];
  revokedNotices: RevokedCrewNotice[];
  dismissRevokedNotice: (crewId: string) => void;
  signInCloudGoogle: () => Promise<void>;
  signOutCloudGoogle: (beforeSignOut?: () => Promise<void>) => Promise<void>;
  createCrew: (input: { name: string; description: string }) => Promise<{ error?: string; crewId?: string }>;
  joinCrewByCode: (rawCode: string) => Promise<{ error?: string; crewName?: string }>;
  addCrewMember: (
    crewId: string,
    input: {
      name: string;
      email: string;
      agencyRole: string;
      crewRole: CrewRole;
      photoURL?: string;
    }
  ) => Promise<{ error?: string }>;
  updateMemberRole: (
    crewId: string,
    memberUid: string,
    nextRole: CrewRole
  ) => Promise<{ error?: string }>;
  removeCrewMember: (crewId: string, memberUid: string) => Promise<{ error?: string }>;
}

interface MembershipIndexRow {
  crewId: string;
  crewName: string;
  crewRole: CrewRole;
}

function tsToMs(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'number') return val;
  return Date.now();
}

export function useCrewMembers({
  agencyRoleFallback,
  hideOnlineStatus,
  onNotify,
}: UseCrewMembersParams): UseCrewMembersResult {
  const [cloudUser, setCloudUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [loadingCrews, setLoadingCrews] = useState<boolean>(false);

  const [membershipIndex, setMembershipIndex] = useState<MembershipIndexRow[]>([]);
  const [crewsById, setCrewsById] = useState<Record<string, Omit<CrewInfo, 'myRole'>>>({});
  const [membersByCrew, setMembersByCrew] = useState<Record<string, CrewMemberRecord[]>>({});
  const [optimisticMembers, setOptimisticMembers] = useState<CrewMemberRecord[] | null>(null);
  const [revokedNotices, setRevokedNotices] = useState<RevokedCrewNotice[]>([]);

  const crewDocUnsubsRef = useRef<Map<string, Unsubscribe>>(new Map());
  const crewMembersUnsubsRef = useRef<Map<string, Unsubscribe>>(new Map());
  const knownCrewsRef = useRef<Map<string, string>>(new Map());
  const selfInitiatedLeaveRef = useRef<Set<string>>(new Set());
  const notifyRef = useRef(onNotify);
  notifyRef.current = onNotify;

  const clearAllCrewListeners = useCallback(() => {
    for (const unsub of crewDocUnsubsRef.current.values()) unsub();
    crewDocUnsubsRef.current.clear();
    for (const unsub of crewMembersUnsubsRef.current.values()) unsub();
    crewMembersUnsubsRef.current.clear();
  }, []);

  const recordRevocation = useCallback((crewId: string, crewName: string) => {
    if (selfInitiatedLeaveRef.current.has(crewId)) {
      selfInitiatedLeaveRef.current.delete(crewId);
      return;
    }
    const nowTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setRevokedNotices((prev) => {
      if (prev.some((n) => n.crewId === crewId)) return prev;
      return [{ crewId, crewName, revokedAt: nowTime }, ...prev];
    });
    notifyRef.current?.(
      'warning',
      'Akses Kru Dicabut',
      `Anda telah dihapus dari kru "${crewName}". Akses ke data kru tersebut telah dihentikan secara otomatis.`
    );
  }, []);

  // 1. Auth State Subscription + Private User Profile Bootstrap
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCloudUser(user);
      setAuthReady(true);

      if (!user) {
        clearAllCrewListeners();
        setMembershipIndex([]);
        setCrewsById({});
        setMembersByCrew({});
        setOptimisticMembers(null);
        knownCrewsRef.current.clear();
        setLoadingCrews(false);
        return;
      }

      // Sync /users/{uid} private profile respecting blueprint boundaries
      if (user.emailVerified) {
        const uid = sanitizeId(user.uid, 'user');
        const profileRef = doc(db, 'users', uid);
        const safeName = (user.displayName || user.email?.split('@')[0] || 'Pengguna PRFlow')
          .trim()
          .slice(0, BLUEPRINT_LIMITS.nameMax);
        const safeEmail = (user.email || 'user@prflow.id')
          .trim()
          .toLowerCase()
          .slice(0, BLUEPRINT_LIMITS.emailMax);
        const safePhoto = (user.photoURL || '').slice(0, BLUEPRINT_LIMITS.photoUrlMax);
        const safeRole = (agencyRoleFallback || 'PR Account Director').slice(
          0,
          BLUEPRINT_LIMITS.agencyRoleMax
        );

        void getDoc(profileRef)
          .then((snap) => {
            if (!snap.exists()) {
              return setDoc(profileRef, {
                uid,
                name: safeName,
                email: safeEmail,
                photoURL: safePhoto,
                agencyRole: safeRole,
                hideOnlineStatus,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
            return updateDoc(profileRef, {
              name: safeName,
              email: safeEmail,
              photoURL: safePhoto,
              agencyRole: safeRole,
              hideOnlineStatus,
              updatedAt: serverTimestamp(),
            });
          })
          .catch((err) => {
            console.warn('Profile sync deferred:', err);
          });
      }
    });

    return () => unsub();
  }, [agencyRoleFallback, hideOnlineStatus, clearAllCrewListeners]);

  // 2. Subscribe to /users/{uid}/crewMemberships (Real-time list of user's crews)
  useEffect(() => {
    if (!cloudUser) return;

    setLoadingCrews(true);
    const uid = cloudUser.uid;
    const membershipsQ = query(
      collection(db, 'users', uid, 'crewMemberships'),
      where('uid', '==', uid)
    );

    const unsub = onSnapshot(
      membershipsQ,
      (snap) => {
        const rows: MembershipIndexRow[] = snap.docs.map((d) => {
          const data = d.data();
          const role =
            data.crewRole === 'owner' || data.crewRole === 'admin' ? data.crewRole : 'member';
          return {
            crewId: String(data.crewId || d.id),
            crewName: String(data.crewName || 'Kru PR'),
            crewRole: role,
          };
        });

        // Detect crews from which the user was removed in real time
        const nextIds = new Set(rows.map((r) => r.crewId));
        for (const [prevCrewId, prevCrewName] of knownCrewsRef.current.entries()) {
          if (!nextIds.has(prevCrewId)) {
            recordRevocation(prevCrewId, prevCrewName);
            knownCrewsRef.current.delete(prevCrewId);
          }
        }
        for (const row of rows) {
          knownCrewsRef.current.set(row.crewId, row.crewName);
        }

        setMembershipIndex(rows);
        setLoadingCrews(false);
      },
      (err) => {
        setLoadingCrews(false);
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.LIST, `users/${uid}/crewMemberships`);
        }
      }
    );

    return () => {
      unsub();
    };
  }, [cloudUser, recordRevocation]);

  // 3. Subscribe to each crew document & its live /crews/{crewId}/members subcollection
  const crewIdsKey = useMemo(
    () => membershipIndex.map((r) => r.crewId).sort().join(','),
    [membershipIndex]
  );

  useEffect(() => {
    if (!cloudUser) {
      clearAllCrewListeners();
      return;
    }

    const activeIds = new Set(crewIdsKey ? crewIdsKey.split(',') : []);
    const docUnsubs = crewDocUnsubsRef.current;
    const memUnsubs = crewMembersUnsubsRef.current;

    // Clean up listeners for crews no longer in membershipIndex
    for (const [crewId, unsub] of docUnsubs.entries()) {
      if (!activeIds.has(crewId)) {
        unsub();
        docUnsubs.delete(crewId);
        setCrewsById((prev) => {
          if (!(crewId in prev)) return prev;
          const next = { ...prev };
          delete next[crewId];
          return next;
        });
      }
    }
    for (const [crewId, unsub] of memUnsubs.entries()) {
      if (!activeIds.has(crewId)) {
        unsub();
        memUnsubs.delete(crewId);
        setMembersByCrew((prev) => {
          if (!(crewId in prev)) return prev;
          const next = { ...prev };
          delete next[crewId];
          return next;
        });
      }
    }

    // Attach listeners for new crews
    for (const crewId of activeIds) {
      if (!docUnsubs.has(crewId)) {
        const unsubDoc = onSnapshot(
          doc(db, 'crews', crewId),
          (snap) => {
            if (!snap.exists()) return;
            const d = snap.data();
            setCrewsById((prev) => ({
              ...prev,
              [crewId]: {
                id: crewId,
                name: String(d.name || 'Kru PR'),
                description: String(d.description || ''),
                inviteCode: String(d.inviteCode || ''),
                ownerUid: String(d.ownerUid || ''),
              },
            }));
          },
          (err) => {
            if (isPermissionDeniedError(err)) {
              const name = knownCrewsRef.current.get(crewId) || 'Kru PR';
              recordRevocation(crewId, name);
              // Immediately purge local cache for revoked crew
              setCrewsById((prev) => {
                const next = { ...prev };
                delete next[crewId];
                return next;
              });
              setMembersByCrew((prev) => {
                const next = { ...prev };
                delete next[crewId];
                return next;
              });
            }
          }
        );
        docUnsubs.set(crewId, unsubDoc);
      }

      if (!memUnsubs.has(crewId)) {
        const membersQ = query(
          collection(db, 'crews', crewId, 'members'),
          where('crewId', '==', crewId)
        );
        const unsubMem = onSnapshot(
          membersQ,
          (snap) => {
            const list: CrewMemberRecord[] = snap.docs.map((d) => {
              const data = d.data();
              const crewRole: CrewRole =
                data.crewRole === 'owner' || data.crewRole === 'admin'
                  ? data.crewRole
                  : 'member';
              return {
                uid: String(data.uid || d.id),
                crewId: String(data.crewId || crewId),
                crewName: String(data.crewName || ''),
                name: String(data.name || 'Anggota'),
                email: String(data.email || ''),
                photoURL: String(data.photoURL || ''),
                crewRole,
                agencyRole: String(data.agencyRole || 'PR Crew'),
                addedBy: String(data.addedBy || ''),
                inviteCode: String(data.inviteCode || ''),
                joinedAtMs: tsToMs(data.joinedAt),
                updatedAtMs: tsToMs(data.updatedAt),
              };
            });

            // Database snapshot is always authoritative; clear optimistic overlay when synced
            setOptimisticMembers(null);
            setMembersByCrew((prev) => ({
              ...prev,
              [crewId]: list,
            }));
          },
          (err) => {
            if (isPermissionDeniedError(err)) {
              const name = knownCrewsRef.current.get(crewId) || 'Kru PR';
              recordRevocation(crewId, name);
              setMembersByCrew((prev) => {
                const next = { ...prev };
                delete next[crewId];
                return next;
              });
            }
          }
        );
        memUnsubs.set(crewId, unsubMem);
      }
    }
  }, [cloudUser, crewIdsKey, clearAllCrewListeners, recordRevocation]);

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllCrewListeners();
    };
  }, [clearAllCrewListeners]);

  // Derived authoritative crews & members
  const crews = useMemo<CrewInfo[]>(() => {
    return membershipIndex.map((idx) => {
      const meta = crewsById[idx.crewId];
      // Derive live role from authoritative /crews/{crewId}/members/{uid} when available
      const selfMember = cloudUser
        ? (membersByCrew[idx.crewId] || []).find((m) => m.uid === cloudUser.uid)
        : undefined;
      return {
        id: idx.crewId,
        name: meta?.name || idx.crewName,
        description: meta?.description || '',
        inviteCode: meta?.inviteCode || '',
        ownerUid: meta?.ownerUid || '',
        myRole: selfMember?.crewRole || idx.crewRole,
      };
    });
  }, [membershipIndex, crewsById, membersByCrew, cloudUser]);

  const authoritativeMembers = useMemo<CrewMemberRecord[]>(() => {
    const all: CrewMemberRecord[] = [];
    for (const crew of crews) {
      const list = membersByCrew[crew.id] || [];
      for (const m of list) {
        all.push({ ...m, crewName: m.crewName || crew.name });
      }
    }
    return all;
  }, [crews, membersByCrew]);

  const members = optimisticMembers ?? authoritativeMembers;

  const trackedUids = useMemo(
    () => Array.from(new Set(authoritativeMembers.map((m) => m.uid))),
    [authoritativeMembers]
  );

  // ---------------------------------------------------------------------------
  // Actions: Google Auth & Crew CRUD (Optimistic + Atomic Batch + Rollback)
  // ---------------------------------------------------------------------------
  const signInCloudGoogle = useCallback(async () => {
    setSigningIn(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      notifyRef.current?.(
        'success',
        'Sinkronisasi Real-Time Aktif',
        `Terhubung sebagai ${cred.user.displayName || cred.user.email}. Status presence & anggota kru kini sinkron secara live.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan akun Google.';
      if (!msg.includes('popup-closed-by-user')) {
        notifyRef.current?.('danger', 'Gagal Menghubungkan Google', msg);
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutCloudGoogle = useCallback(async (beforeSignOut?: () => Promise<void>) => {
    try {
      if (beforeSignOut) {
        await beforeSignOut();
      }
      await signOut(auth);
      notifyRef.current?.(
        'info',
        'Sinkronisasi Cloud Diputus',
        'Status Anda ditandai Offline dan koneksi real-time telah diakhiri.'
      );
    } catch (err) {
      console.error('Cloud signOut error:', err);
    }
  }, []);

  const createCrew = useCallback(
    async (input: { name: string; description: string }): Promise<{ error?: string; crewId?: string }> => {
      if (!cloudUser) {
        return { error: 'Aktifkan Sinkronisasi Real-Time (Google) terlebih dahulu.' };
      }
      const validated = validateNewCrewInput(input);
      if (validated.error) return { error: validated.error };

      const crewId = sanitizeId(`crew_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`);
      const inviteCode = generateCrewInviteCode();
      const uid = cloudUser.uid;
      const ownerName = (cloudUser.displayName || cloudUser.email?.split('@')[0] || 'Owner Kru')
        .trim()
        .slice(0, BLUEPRINT_LIMITS.nameMax);
      const ownerEmail = (cloudUser.email || 'owner@prflow.id')
        .trim()
        .toLowerCase()
        .slice(0, BLUEPRINT_LIMITS.emailMax);
      const ownerPhoto = (cloudUser.photoURL || '').slice(0, BLUEPRINT_LIMITS.photoUrlMax);
      const safeAgencyRole = (agencyRoleFallback || 'PR Account Director').slice(
        0,
        BLUEPRINT_LIMITS.agencyRoleMax
      );

      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'crews', crewId), {
          id: crewId,
          name: validated.name,
          description: validated.description,
          inviteCode,
          ownerUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'crews', crewId, 'members', uid), {
          uid,
          crewId,
          crewName: validated.name,
          name: ownerName,
          email: ownerEmail,
          photoURL: ownerPhoto,
          crewRole: 'owner',
          agencyRole: safeAgencyRole,
          addedBy: uid,
          inviteCode: '',
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'users', uid, 'crewMemberships', crewId), {
          uid,
          crewId,
          crewName: validated.name,
          crewRole: 'owner',
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'crewInvites', inviteCode), {
          code: inviteCode,
          crewId,
          crewName: validated.name,
          createdBy: uid,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await batch.commit();

        notifyRef.current?.(
          'success',
          'Kru Baru Dibuat',
          `Kru "${validated.name}" siap digunakan. Kode gabung: ${inviteCode}.`
        );
        return { crewId };
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.CREATE, `crews/${crewId}`);
        }
        return { error: err instanceof Error ? err.message : 'Gagal membuat kru.' };
      }
    },
    [cloudUser, agencyRoleFallback]
  );

  const joinCrewByCode = useCallback(
    async (rawCode: string): Promise<{ error?: string; crewName?: string }> => {
      if (!cloudUser) {
        return { error: 'Aktifkan Sinkronisasi Real-Time (Google) terlebih dahulu.' };
      }
      const code = rawCode.trim().toUpperCase();
      if (!BLUEPRINT_LIMITS.inviteCodePattern.test(code) || code.length < BLUEPRINT_LIMITS.inviteCodeMin) {
        return { error: 'Format kode kru tidak valid (contoh: PR-8K4M2P).' };
      }

      try {
        const inviteSnap = await getDoc(doc(db, 'crewInvites', code));
        if (!inviteSnap.exists()) {
          return { error: `Kode kru "${code}" tidak ditemukan.` };
        }
        const inviteData = inviteSnap.data();
        if (!inviteData.active) {
          return { error: `Kode kru "${code}" sudah tidak aktif.` };
        }
        const crewId = String(inviteData.crewId);
        const crewName = String(inviteData.crewName || 'Kru PR');
        const uid = cloudUser.uid;
        const memberName = (cloudUser.displayName || cloudUser.email?.split('@')[0] || 'Anggota Kru')
          .trim()
          .slice(0, BLUEPRINT_LIMITS.nameMax);
        const memberEmail = (cloudUser.email || 'member@prflow.id')
          .trim()
          .toLowerCase()
          .slice(0, BLUEPRINT_LIMITS.emailMax);
        const memberPhoto = (cloudUser.photoURL || '').slice(0, BLUEPRINT_LIMITS.photoUrlMax);
        const safeAgencyRole = (agencyRoleFallback || 'PR Crew').slice(
          0,
          BLUEPRINT_LIMITS.agencyRoleMax
        );

        const batch = writeBatch(db);
        batch.set(doc(db, 'crews', crewId, 'members', uid), {
          uid,
          crewId,
          crewName,
          name: memberName,
          email: memberEmail,
          photoURL: memberPhoto,
          crewRole: 'member',
          agencyRole: safeAgencyRole,
          addedBy: uid,
          inviteCode: code,
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'users', uid, 'crewMemberships', crewId), {
          uid,
          crewId,
          crewName,
          crewRole: 'member',
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await batch.commit();

        notifyRef.current?.(
          'success',
          'Berhasil Bergabung ke Kru',
          `Anda kini terdaftar sebagai anggota kru "${crewName}".`
        );
        return { crewName };
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          return { error: 'Izin bergabung ditolak. Pastikan kode kru valid dan email Google terverifikasi.' };
        }
        return { error: err instanceof Error ? err.message : 'Gagal bergabung ke kru.' };
      }
    },
    [cloudUser, agencyRoleFallback]
  );

  const addCrewMember = useCallback(
    async (
      crewId: string,
      input: {
        name: string;
        email: string;
        agencyRole: string;
        crewRole: CrewRole;
        photoURL?: string;
      }
    ): Promise<{ error?: string }> => {
      if (!cloudUser) {
        return { error: 'Aktifkan Sinkronisasi Real-Time (Google) terlebih dahulu.' };
      }
      const crew = crews.find((c) => c.id === crewId);
      if (!crew) return { error: 'Kru tidak ditemukan.' };

      const validated = validateNewMemberInput(input);
      if (validated.error) return { error: validated.error };

      const memberId = createMemberIdFromEmail(validated.email);
      const now = Date.now();
      const optimisticRecord: CrewMemberRecord = {
        uid: memberId,
        crewId,
        crewName: crew.name,
        name: validated.name,
        email: validated.email,
        photoURL: validated.photoURL,
        crewRole: validated.crewRole,
        agencyRole: validated.agencyRole,
        addedBy: cloudUser.uid,
        inviteCode: '',
        joinedAtMs: now,
        updatedAtMs: now,
        isOptimistic: true,
      };

      // Optimistic update
      setOptimisticMembers(applyOptimisticAddMember(authoritativeMembers, optimisticRecord));

      try {
        await setDoc(doc(db, 'crews', crewId, 'members', memberId), {
          uid: memberId,
          crewId,
          crewName: crew.name,
          name: validated.name,
          email: validated.email,
          photoURL: validated.photoURL,
          crewRole: validated.crewRole,
          agencyRole: validated.agencyRole,
          addedBy: cloudUser.uid,
          inviteCode: '',
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        notifyRef.current?.(
          'success',
          'Anggota Kru Ditambahkan',
          `${validated.name} ditambahkan ke ${crew.name} dan tersinkron ke seluruh anggota.`
        );
        return {};
      } catch (err) {
        // Rollback optimistic state on failure
        setOptimisticMembers(null);
        const msg = isPermissionDeniedError(err)
          ? 'Hanya Owner atau Admin kru yang dapat menambahkan anggota baru.'
          : err instanceof Error
            ? err.message
            : 'Gagal menambahkan anggota kru.';
        notifyRef.current?.('danger', 'Gagal Menambah Anggota', msg);
        return { error: msg };
      }
    },
    [cloudUser, crews, authoritativeMembers]
  );

  const updateMemberRole = useCallback(
    async (
      crewId: string,
      memberUid: string,
      nextRole: CrewRole
    ): Promise<{ error?: string }> => {
      if (!cloudUser) return { error: 'Belum terhubung ke Cloud.' };
      if (nextRole === 'owner') return { error: 'Peran Owner tidak dapat diubah dari sini.' };

      setOptimisticMembers(
        applyOptimisticRoleUpdate(authoritativeMembers, crewId, memberUid, nextRole)
      );

      try {
        await updateDoc(doc(db, 'crews', crewId, 'members', memberUid), {
          crewRole: nextRole,
          updatedAt: serverTimestamp(),
        });

        // Also update the user's membership index if they are a real Firebase user
        if (!memberUid.startsWith('mem_')) {
          try {
            await updateDoc(doc(db, 'users', memberUid, 'crewMemberships', crewId), {
              crewRole: nextRole,
              updatedAt: serverTimestamp(),
            });
          } catch {
            // Index doc might not exist for manually added accounts
          }
        }

        notifyRef.current?.(
          'info',
          'Peran Kru Diperbarui',
          `Peran anggota berhasil diubah menjadi ${nextRole === 'admin' ? 'Admin Kru' : 'Anggota'}.`
        );
        return {};
      } catch (err) {
        setOptimisticMembers(null);
        const msg = isPermissionDeniedError(err)
          ? 'Anda tidak memiliki izin untuk mengubah peran anggota ini.'
          : 'Gagal memperbarui peran anggota.';
        notifyRef.current?.('danger', 'Gagal Mengubah Peran', msg);
        return { error: msg };
      }
    },
    [cloudUser, authoritativeMembers]
  );

  const removeCrewMember = useCallback(
    async (crewId: string, memberUid: string): Promise<{ error?: string }> => {
      if (!cloudUser) return { error: 'Belum terhubung ke Cloud.' };

      if (memberUid === cloudUser.uid) {
        selfInitiatedLeaveRef.current.add(crewId);
      }

      // Optimistic removal
      setOptimisticMembers(applyOptimisticRemoveMember(authoritativeMembers, crewId, memberUid));

      try {
        await deleteDoc(doc(db, 'crews', crewId, 'members', memberUid));

        // Remove membership index too so removed user loses crew listing immediately
        if (!memberUid.startsWith('mem_')) {
          try {
            await deleteDoc(doc(db, 'users', memberUid, 'crewMemberships', crewId));
          } catch {
            // Best effort if index already removed
          }
        }

        notifyRef.current?.(
          'info',
          'Anggota Dihapus dari Kru',
          'Keanggotaan dan hak akses kru telah dicabut secara real-time.'
        );
        return {};
      } catch (err) {
        setOptimisticMembers(null);
        selfInitiatedLeaveRef.current.delete(crewId);
        const msg = isPermissionDeniedError(err)
          ? 'Hanya Owner atau Admin kru yang dapat menghapus anggota (Owner tidak dapat dihapus).'
          : 'Gagal menghapus anggota kru.';
        notifyRef.current?.('danger', 'Gagal Menghapus Anggota', msg);
        return { error: msg };
      }
    },
    [cloudUser, authoritativeMembers]
  );

  const dismissRevokedNotice = useCallback((crewId: string) => {
    setRevokedNotices((prev) => prev.filter((n) => n.crewId !== crewId));
  }, []);

  return {
    cloudUser,
    authReady,
    signingIn,
    loadingCrews,
    crews,
    members,
    trackedUids,
    revokedNotices,
    dismissRevokedNotice,
    signInCloudGoogle,
    signOutCloudGoogle,
    createCrew,
    joinCrewByCode,
    addCrewMember,
    updateMemberRole,
    removeCrewMember,
  };
}
