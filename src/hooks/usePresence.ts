import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, isPermissionDeniedError, OperationType, handleFirestoreError } from '../lib/firebase';
import {
  countFreshSessions,
  HEARTBEAT_INTERVAL_MS,
  isEffectivelyOnline,
  PRESENCE_TIMEOUT_MS,
  shouldWriteThrottledHeartbeat,
  type ConnectionSyncState,
  type PresenceRecord,
} from '../lib/presenceLogic';

const TAB_SESSION_STORAGE_KEY = 'prflow_presence_tab_session_id';
const LOCAL_SESSIONS_STORAGE_KEY = 'prflow_local_presence_sessions_v1';

function getOrCreateTabSessionId(): string {
  try {
    const existing = sessionStorage.getItem(TAB_SESSION_STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_-]{4,128}$/.test(existing)) {
      return existing;
    }
    const generated = `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(TAB_SESSION_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent || '';
  const os = /Mac/i.test(ua)
    ? 'macOS'
    : /Win/i.test(ua)
      ? 'Windows'
      : /Android/i.test(ua)
        ? 'Android'
        : /iPhone|iPad/i.test(ua)
          ? 'iOS'
          : 'Linux';
  const browser = /Edg/i.test(ua)
    ? 'Edge'
    : /Chrome/i.test(ua)
      ? 'Chrome'
      : /Firefox/i.test(ua)
        ? 'Firefox'
        : /Safari/i.test(ua)
          ? 'Safari'
          : 'Browser';
  return `${browser} · ${os}`.slice(0, 80);
}

function readLocalTabMap(): Record<string, Record<string, number>> {
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalTabMap(map: Record<string, Record<string, number>>): void {
  try {
    localStorage.setItem(LOCAL_SESSIONS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota error
  }
}

export interface UsePresenceParams {
  cloudUid: string | null;
  cloudEmailVerified: boolean;
  localUserKey: string | null;
  trackedUids: string[];
  hideOnlineStatus: boolean;
}

export interface UsePresenceResult {
  presenceMap: Record<string, PresenceRecord>;
  nowMs: number;
  connectionState: ConnectionSyncState;
  selfOnline: boolean;
  selfActiveSessions: number;
  markOfflineBeforeLogout: () => Promise<void>;
}

export function usePresence({
  cloudUid,
  cloudEmailVerified,
  localUserKey,
  trackedUids,
  hideOnlineStatus,
}: UsePresenceParams): UsePresenceResult {
  const [cloudPresenceMap, setCloudPresenceMap] = useState<Record<string, PresenceRecord>>({});
  const [localPresenceMap, setLocalPresenceMap] = useState<Record<string, PresenceRecord>>({});
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [networkOnline, setNetworkOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [snapshotFromCache, setSnapshotFromCache] = useState<boolean>(false);

  const sessionIdRef = useRef<string>(getOrCreateTabSessionId());
  const activeCloudSessionsRef = useRef<number>(1);
  const lastCloudWriteRef = useRef<number>(0);
  const hideStatusRef = useRef<boolean>(hideOnlineStatus);
  const memberUnsubsRef = useRef<Map<string, Unsubscribe>>(new Map());
  const isUnmountingRef = useRef<boolean>(false);

  hideStatusRef.current = hideOnlineStatus;

  // Periodic clock tick (every 15s) to evaluate heartbeat timeouts and refresh relative "Terakhir aktif" labels
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  // Browser online/offline network detection
  useEffect(() => {
    const onOnline = () => {
      setNetworkOnline(true);
      setNowMs(Date.now());
    };
    const onOffline = () => {
      setNetworkOnline(false);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 1. Local multi-tab presence (active even before Google Cloud Sync is linked)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!localUserKey) {
      setLocalPresenceMap({});
      return;
    }

    const tabId = sessionIdRef.current;
    const syncLocalPresence = (removeSelf = false) => {
      const now = Date.now();
      const map = readLocalTabMap();
      const userTabs = { ...(map[localUserKey] || {}) };

      if (removeSelf) {
        delete userTabs[tabId];
      } else {
        userTabs[tabId] = now;
      }

      // Prune stale local tabs (> 75s)
      const freshTabs: Record<string, number> = {};
      for (const [id, ts] of Object.entries(userTabs)) {
        if (typeof ts === 'number' && now - ts <= PRESENCE_TIMEOUT_MS) {
          freshTabs[id] = ts;
        }
      }

      if (Object.keys(freshTabs).length > 0) {
        map[localUserKey] = freshTabs;
      } else {
        delete map[localUserKey];
      }
      writeLocalTabMap(map);

      const count = Object.keys(freshTabs).length;
      setLocalPresenceMap((prev) => ({
        ...prev,
        [localUserKey]: {
          uid: localUserKey,
          online: count > 0,
          hideOnlineStatus: hideStatusRef.current,
          lastHeartbeatMs: now,
          activeSessionCount: count,
          lastSeenMs: now,
        },
      }));
    };

    syncLocalPresence(false);
    const interval = window.setInterval(() => syncLocalPresence(false), HEARTBEAT_INTERVAL_MS);

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === LOCAL_SESSIONS_STORAGE_KEY) {
        const now = Date.now();
        const map = readLocalTabMap();
        const userTabs = map[localUserKey] || {};
        const count = countFreshSessions(
          Object.values(userTabs).map((ts) => ({ lastHeartbeatMs: ts })),
          now
        );
        setLocalPresenceMap((prev) => ({
          ...prev,
          [localUserKey]: {
            uid: localUserKey,
            online: count > 0,
            hideOnlineStatus: hideStatusRef.current,
            lastHeartbeatMs: now,
            activeSessionCount: count,
            lastSeenMs: now,
          },
        }));
      }
    };

    const onUnload = () => syncLocalPresence(true);
    window.addEventListener('storage', onStorage);
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('beforeunload', onUnload);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pagehide', onUnload);
      window.removeEventListener('beforeunload', onUnload);
      syncLocalPresence(true);
    };
  }, [localUserKey, hideOnlineStatus]);

  // ---------------------------------------------------------------------------
  // 2. Firebase Firestore Real-Time Presence (Multi-Tab Sessions + Heartbeat)
  // ---------------------------------------------------------------------------
  const writeCloudHeartbeat = useCallback(
    async (uid: string, force: boolean, onlineOverride?: boolean, sessionCountOverride?: number) => {
      if (!cloudEmailVerified) return;
      const now = Date.now();
      if (!shouldWriteThrottledHeartbeat(lastCloudWriteRef.current, now, force)) {
        return;
      }
      lastCloudWriteRef.current = now;

      const sessionId = sessionIdRef.current;
      const sessionPath = `presence/${uid}/sessions/${sessionId}`;
      const presencePath = `presence/${uid}`;
      const isOnlineTarget = onlineOverride !== undefined ? onlineOverride : true;
      const countTarget =
        sessionCountOverride !== undefined
          ? sessionCountOverride
          : Math.max(1, activeCloudSessionsRef.current);

      try {
        if (isOnlineTarget) {
          await setDoc(
            doc(db, 'presence', uid, 'sessions', sessionId),
            {
              uid,
              sessionId,
              deviceLabel: getDeviceLabel(),
              lastHeartbeatMs: now,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: false }
          );
        }

        await setDoc(
          doc(db, 'presence', uid),
          {
            uid,
            online: isOnlineTarget && countTarget > 0,
            hideOnlineStatus: hideStatusRef.current,
            lastHeartbeatMs: now,
            activeSessionCount: isOnlineTarget ? countTarget : Math.max(0, countTarget),
            lastSeen: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: false }
        );
      } catch (err) {
        if (!isPermissionDeniedError(err)) {
          // Transient offline write errors are retried on next heartbeat/reconnect
          console.warn('Presence heartbeat deferred:', err);
          return;
        }
        handleFirestoreError(err, OperationType.WRITE, isOnlineTarget ? sessionPath : presencePath);
      }
    },
    [cloudEmailVerified]
  );

  const removeCurrentCloudSession = useCallback(
    async (uid: string) => {
      if (!cloudEmailVerified) return;
      const sessionId = sessionIdRef.current;
      const remaining = Math.max(0, activeCloudSessionsRef.current - 1);
      const now = Date.now();

      try {
        await deleteDoc(doc(db, 'presence', uid, 'sessions', sessionId));
      } catch {
        // Best effort during unload/logout
      }

      try {
        await setDoc(
          doc(db, 'presence', uid),
          {
            uid,
            online: remaining > 0,
            hideOnlineStatus: hideStatusRef.current,
            lastHeartbeatMs: now,
            activeSessionCount: remaining,
            lastSeen: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: false }
        );
      } catch {
        // Best effort during unload/logout
      }
    },
    [cloudEmailVerified]
  );

  // Manage own cloud presence lifecycle + multi-tab sessions listener
  useEffect(() => {
    if (!cloudUid || !cloudEmailVerified) {
      return;
    }

    isUnmountingRef.current = false;
    lastCloudWriteRef.current = 0;

    // Subscribe to own active sessions subcollection to accurately count multi-tab sessions
    const sessionsQuery = query(
      collection(db, 'presence', cloudUid, 'sessions'),
      where('uid', '==', cloudUid)
    );
    const unsubSessions = onSnapshot(
      sessionsQuery,
      (snap) => {
        setSnapshotFromCache(snap.metadata.fromCache);
        const now = Date.now();
        const freshCount = countFreshSessions(
          snap.docs.map((d) => ({
            lastHeartbeatMs: Number(d.data().lastHeartbeatMs) || 0,
          })),
          now
        );
        const nextCount = Math.max(1, freshCount);
        activeCloudSessionsRef.current = nextCount;
      },
      (err) => {
        if (isPermissionDeniedError(err)) {
          console.warn('Sessions listener permission warning:', err.message);
        }
      }
    );

    // Initial online registration
    void writeCloudHeartbeat(cloudUid, true, true, Math.max(1, activeCloudSessionsRef.current));

    // Periodic lightweight 30s heartbeat
    const heartbeatTimer = window.setInterval(() => {
      if (!isUnmountingRef.current && navigator.onLine) {
        void writeCloudHeartbeat(cloudUid, false, true);
      }
    }, HEARTBEAT_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void writeCloudHeartbeat(cloudUid, false, true);
      }
    };

    const onReconnect = () => {
      void writeCloudHeartbeat(cloudUid, true, true);
    };

    const onPageExit = () => {
      void removeCurrentCloudSession(cloudUid);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onReconnect);
    window.addEventListener('pagehide', onPageExit);
    window.addEventListener('beforeunload', onPageExit);

    return () => {
      isUnmountingRef.current = true;
      window.clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onReconnect);
      window.removeEventListener('pagehide', onPageExit);
      window.removeEventListener('beforeunload', onPageExit);
      unsubSessions();
    };
  }, [cloudUid, cloudEmailVerified, writeCloudHeartbeat, removeCurrentCloudSession]);

  // Immediately push privacy toggle changes to Firestore
  useEffect(() => {
    if (!cloudUid || !cloudEmailVerified) return;
    void writeCloudHeartbeat(cloudUid, true, true);
  }, [cloudUid, cloudEmailVerified, hideOnlineStatus, writeCloudHeartbeat]);

  // Subscribe to each tracked crew member's /presence/{uid} doc (deduplicated, zero memory leaks)
  const trackedKey = useMemo(() => {
    const unique = Array.from(
      new Set([...(cloudUid ? [cloudUid] : []), ...trackedUids.filter((id) => Boolean(id) && !id.startsWith('mem_'))])
    ).sort();
    return unique.join(',');
  }, [cloudUid, trackedUids]);

  useEffect(() => {
    const unsubs = memberUnsubsRef.current;

    if (!cloudUid) {
      for (const unsub of unsubs.values()) unsub();
      unsubs.clear();
      setCloudPresenceMap({});
      return;
    }

    const desiredUids = new Set(trackedKey ? trackedKey.split(',') : []);

    // Unsubscribe removed UIDs
    for (const [uid, unsub] of unsubs.entries()) {
      if (!desiredUids.has(uid)) {
        unsub();
        unsubs.delete(uid);
        setCloudPresenceMap((prev) => {
          if (!(uid in prev)) return prev;
          const next = { ...prev };
          delete next[uid];
          return next;
        });
      }
    }

    // Subscribe newly added UIDs
    for (const uid of desiredUids) {
      if (unsubs.has(uid)) continue;
      const unsub = onSnapshot(
        doc(db, 'presence', uid),
        (snap) => {
          setSnapshotFromCache(snap.metadata.fromCache);
          if (!snap.exists()) {
            setCloudPresenceMap((prev) => {
              if (!(uid in prev)) return prev;
              const next = { ...prev };
              delete next[uid];
              return next;
            });
            return;
          }
          const data = snap.data();
          const lastSeenTs = data.lastSeen instanceof Timestamp ? data.lastSeen.toMillis() : null;
          const record: PresenceRecord = {
            uid,
            online: Boolean(data.online),
            hideOnlineStatus: Boolean(data.hideOnlineStatus),
            lastHeartbeatMs:
              typeof data.lastHeartbeatMs === 'number'
                ? data.lastHeartbeatMs
                : lastSeenTs ?? 0,
            activeSessionCount:
              typeof data.activeSessionCount === 'number' ? data.activeSessionCount : 0,
            lastSeenMs: lastSeenTs ?? (typeof data.lastHeartbeatMs === 'number' ? data.lastHeartbeatMs : null),
          };
          setCloudPresenceMap((prev) => {
            const existingRec = prev[uid];
            if (
              existingRec &&
              existingRec.online === record.online &&
              existingRec.hideOnlineStatus === record.hideOnlineStatus &&
              existingRec.lastHeartbeatMs === record.lastHeartbeatMs &&
              existingRec.activeSessionCount === record.activeSessionCount &&
              existingRec.lastSeenMs === record.lastSeenMs
            ) {
              return prev;
            }
            return { ...prev, [uid]: record };
          });
        },
        (err) => {
          if (!isPermissionDeniedError(err)) {
            console.warn(`Presence subscription error for ${uid}:`, err);
          }
        }
      );
      unsubs.set(uid, unsub);
    }
  }, [cloudUid, trackedKey]);

  // Final cleanup on unmount
  useEffect(() => {
    const unsubs = memberUnsubsRef.current;
    return () => {
      for (const unsub of unsubs.values()) unsub();
      unsubs.clear();
    };
  }, []);

  const markOfflineBeforeLogout = useCallback(async () => {
    if (cloudUid) {
      await removeCurrentCloudSession(cloudUid);
    }
  }, [cloudUid, removeCurrentCloudSession]);

  const presenceMap = useMemo<Record<string, PresenceRecord>>(() => {
    return {
      ...localPresenceMap,
      ...cloudPresenceMap,
    };
  }, [localPresenceMap, cloudPresenceMap]);

  const selfKey = cloudUid || localUserKey;
  const selfRecord = selfKey ? presenceMap[selfKey] : undefined;
  const selfOnline = selfRecord
    ? isEffectivelyOnline(selfRecord, nowMs)
    : Boolean(selfKey && networkOnline && !hideOnlineStatus);
  const selfActiveSessions = selfRecord?.activeSessionCount ?? (selfOnline ? 1 : 0);

  const connectionState: ConnectionSyncState = useMemo(() => {
    if (!networkOnline) return 'reconnecting';
    if (!cloudUid) return 'local';
    if (snapshotFromCache) return 'reconnecting';
    return 'synced';
  }, [networkOnline, cloudUid, snapshotFromCache]);

  return {
    presenceMap,
    nowMs,
    connectionState,
    selfOnline,
    selfActiveSessions,
    markOfflineBeforeLogout,
  };
}
