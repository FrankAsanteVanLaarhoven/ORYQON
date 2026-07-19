import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  can,
  canApprove,
  ROLE_PERMISSIONS,
  type Actor,
  type Role,
} from '../src/rbac/roles.ts';

const actor = (actorId: string, ...roles: Role[]): Actor => ({
  actorId,
  roles: new Set(roles),
});

test('permissions are granted through roles', () => {
  assert.equal(can(actor('u1', 'OPERATOR'), 'campaign.propose'), true);
  assert.equal(can(actor('u1', 'OPERATOR'), 'campaign.approve'), false);
  assert.equal(can(actor('u2', 'APPROVER'), 'campaign.approve'), true);
});

test('propose and approve are never held by the same role (separation of duties)', () => {
  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const both = perms.has('campaign.propose') && perms.has('campaign.approve');
    assert.equal(both, false, `${role} must not hold both propose and approve`);
  }
});

test('an approver cannot approve their own proposal', () => {
  const approver = actor('u3', 'APPROVER');
  assert.equal(canApprove(approver, 'someone-else'), true);
  assert.equal(canApprove(approver, 'u3'), false);
  assert.equal(canApprove(actor('u4', 'OPERATOR'), 'someone-else'), false);
});

test('database administration is disjoint from every application permission', () => {
  const dbPerms = ROLE_PERMISSIONS.DB_ADMIN;
  assert.deepEqual([...dbPerms], ['db.admin']);
  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
    if (role === 'DB_ADMIN') continue;
    assert.equal(perms.has('db.admin'), false, `${role} must not hold db.admin`);
  }
});

test('privileged powers are held by distinct roles', () => {
  // Only APPROVER may change price; only SUPPORT may issue refunds; only
  // PLATFORM_ADMIN may write policy.
  assert.equal(can(actor('a', 'APPROVER'), 'price.change'), true);
  assert.equal(can(actor('a', 'SUPPORT'), 'price.change'), false);
  assert.equal(can(actor('a', 'SUPPORT'), 'refund.issue'), true);
  assert.equal(can(actor('a', 'APPROVER'), 'refund.issue'), false);
  assert.equal(can(actor('a', 'PLATFORM_ADMIN'), 'policy.write'), true);
  assert.equal(can(actor('a', 'ORG_ADMIN'), 'policy.write'), false);
});
