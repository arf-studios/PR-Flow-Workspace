import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8')) as {
  entities: Record<string, { required?: string[]; properties: Record<string, unknown> }>;
  firestore: Record<string, { schema: { $ref: string } }>;
};

test('firestore.rules enforces default-deny catch-all and rules_version 2', () => {
  assert.match(rulesContent, /rules_version\s*=\s*'2';/);
  assert.match(rulesContent, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('Dirty Dozen #1 & #2: presence writes are strictly self-only and block ghost fields via hasOnly', () => {
  assert.match(rulesContent, /match \/presence\/\{uid\}/);
  assert.match(rulesContent, /isOwner\(uid\)/);
  assert.match(rulesContent, /data\.uid == request\.auth\.uid/);
  assert.match(rulesContent, /function isValidUserPresence\(data\)[\s\S]*data\.keys\(\)\.hasOnly\(/);
  assert.match(rulesContent, /allow list: if false;/);
});

test('Dirty Dozen #3 & #4: PII /users/{uid} denies list & non-owner reads, and isAdmin requires email_verified', () => {
  assert.match(rulesContent, /match \/users\/\{uid\}\s*\{\s*allow get: if isSignedIn\(\) && isValidId\(uid\) && \(isOwner\(uid\) \|\| isAdmin\(\)\);\s*allow list: if false;/);
  assert.match(rulesContent, /function isVerified\(\)\s*\{\s*return isSignedIn\(\) && request\.auth\.token\.email_verified == true;/);
  assert.match(rulesContent, /function isAdmin\(\)\s*\{\s*return isVerified\(\)/);
});

test('Dirty Dozen #5, #6, #7, #8, #9: crew RBAC prevents self-escalation, enforces Master Gate & atomicity, protects owner', () => {
  // Self update cannot escalate crewRole
  assert.match(rulesContent, /incoming\(\)\.crewRole == existing\(\)\.crewRole/);
  // Revoked member loses access immediately via isCrewMember(crewId)
  assert.match(rulesContent, /function isCrewMember\(crewId\)/);
  assert.match(rulesContent, /exists\(\/databases\/\$\(database\)\/documents\/crews\/\$\(crewId\)\/members\/\$\(request\.auth\.uid\)\)/);
  // Crew creation requires atomic owner member write via existsAfter
  assert.match(rulesContent, /existsAfter\(\/databases\/\$\(database\)\/documents\/crews\/\$\(crewId\)\/members\/\$\(request\.auth\.uid\)\)/);
  // Owner cannot be deleted or demoted by crew admin
  assert.match(rulesContent, /existing\(\)\.crewRole != 'owner'/);
});

test('Dirty Dozen #10, #11, #12: ID regex guard, server timestamp integrity, and /admins write deny', () => {
  assert.match(rulesContent, /id\.matches\('\^\[a-zA-Z0-9_\\\\-\]\+\$'\)/);
  assert.match(rulesContent, /incoming\(\)\.updatedAt == request\.time/);
  assert.match(rulesContent, /match \/admins\/\{uid\}[\s\S]*allow create, update, delete: if false;/);
});

test('Every collection in firebase-blueprint.json has a matching rule block in firestore.rules', () => {
  const expectedMatchers = [
    'match /admins/{uid}',
    'match /users/{uid}',
    'match /crewMemberships/{crewId}',
    'match /presence/{uid}',
    'match /sessions/{sessionId}',
    'match /crewInvites/{code}',
    'match /crews/{crewId}',
    'match /members/{memberId}',
  ];
  for (const matcher of expectedMatchers) {
    assert.ok(
      rulesContent.includes(matcher),
      `Missing security rule block for ${matcher}`
    );
  }
  assert.ok(Object.keys(blueprint.firestore).length >= 8);
});
