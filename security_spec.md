# Security Specification — PRFlow Workspace Real-Time Presence & Crew Sync

## 1. Data Invariants
1. **Self-Only Presence Integrity**: Only the verified authenticated user (`request.auth.uid == uid`) may create or update `/presence/{uid}` or `/presence/{uid}/sessions/{sessionId}`. No user may spoof another user's online status or `lastSeen`.
2. **PII Isolation**: `/users/{uid}` (containing personal email and settings) is strictly readable only by the owner (`request.auth.uid == uid`) or a verified global admin. Listing `/users` is globally denied (`allow list: if false`).
3. **Master Gate & Instant Revocation**: `/crews/{crewId}/members/{uid}` is the Master Source of Truth for crew access. The instant a member document is deleted from `/crews/{crewId}/members/{uid}`, Firestore immediately returns `PERMISSION_DENIED` on `/crews/{crewId}` and `/crews/{crewId}/members`.
4. **Tiered Crew RBAC**: Only crew `owner` or `admin` roles may add members, change `crewRole`, or remove non-owner members. A regular `member` cannot escalate their own `crewRole` or add/remove other users.
5. **Atomicity Guarantee**: Creating `/crews/{crewId}` requires an atomic batch write that simultaneously creates the owner's `/crews/{crewId}/members/{ownerUid}` record (`existsAfter`). Creating `/users/{uid}/crewMemberships/{crewId}` requires the corresponding `/crews/{crewId}/members/{uid}` document to exist (`existsAfter`).
6. **Temporal Integrity & Immutability**: All `createdAt`, `joinedAt`, `lastSeen`, and `updatedAt` timestamps must match `request.time`. `uid`, `crewId`, `ownerUid`, `addedBy`, `createdAt`, and `joinedAt` are immutable after creation.
7. **Volumetric & ID Hardening**: Every document ID must match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), every string has explicit min/max length bounds matching `firebase-blueprint.json`, and shadow/ghost keys are blocked via `hasOnly()`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Presence Spoofing**: User B attempts `setDoc('/presence/userA', { uid: 'userA', online: false, ... })` -> DENIED (`uid != request.auth.uid`).
2. **Ghost Field / Shadow Update**: User A sends `{ uid: 'userA', online: true, ..., isAdmin: true }` to `/presence/userA` -> DENIED (`hasOnly` rejects `isAdmin`).
3. **PII Blanket Read**: User B attempts `getDoc('/users/userA')` -> DENIED (`isOwner` fails).
4. **Unverified Email Spoof**: Request with `token.email == 'abd.farisy1976@gmail.com'` and `token.email_verified == false` attempts admin write -> DENIED (`email_verified == true` required).
5. **Self Role Escalation**: Crew `member` attempts `updateDoc('/crews/crew1/members/memberUid', { crewRole: 'owner', updatedAt: request.time })` -> DENIED (`incoming().crewRole == existing().crewRole` enforced for non-admins).
6. **Unauthorized Member Addition**: Crew `member` attempts `setDoc('/crews/crew1/members/userC', ...)` -> DENIED (`isCrewAdmin` required).
7. **Revoked Member Access**: Removed user attempts `getDoc('/crews/crew1')` or `list('/crews/crew1/members')` -> DENIED (`isCrewMember(crewId)` is false).
8. **Orphan Crew Creation (Atomicity Bypass)**: User creates `/crews/crewX` without atomically creating `/crews/crewX/members/{uid}` -> DENIED (`existsAfter` fails).
9. **Owner Removal Attack**: Crew `admin` attempts `deleteDoc('/crews/crew1/members/ownerUid')` -> DENIED (`existing().crewRole != 'owner'`).
10. **ID Poisoning**: Attacker attempts `setDoc('/crews/' + 'a'.repeat(200), ...)` or ID with `$`/`/` characters -> DENIED (`isValidId` fails).
11. **Timestamp Forgery**: Client sends backdated `lastSeen` or `updatedAt` instead of `serverTimestamp()` -> DENIED (`!= request.time`).
12. **Client Admin Self-Grant**: User attempts `setDoc('/admins/userA', { uid: 'userA' })` -> DENIED (`/admins` write is globally `false`).
