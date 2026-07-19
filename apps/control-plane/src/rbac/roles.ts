/**
 * Enterprise role separation.
 *
 * Roles map to disjoint capability sets that enforce separation of duties: the
 * operator who proposes cannot approve; approval and refund powers are held by
 * distinct roles; and database administration (`db.admin`) shares NO permission
 * with any application role. An approver additionally cannot approve their own
 * proposal.
 */

export type Permission =
  | 'product.read'
  | 'product.write'
  | 'campaign.propose'
  | 'campaign.approve'
  | 'price.change'
  | 'refund.issue'
  | 'policy.write'
  | 'role.grant'
  | 'connector.manage'
  | 'audit.read'
  | 'db.admin';

export type Role =
  | 'PLATFORM_ADMIN'
  | 'ORG_ADMIN'
  | 'OPERATOR'
  | 'APPROVER'
  | 'SUPPORT'
  | 'ANALYST'
  | 'SERVICE_ACCOUNT'
  | 'DB_ADMIN';

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  PLATFORM_ADMIN: new Set([
    'product.read',
    'product.write',
    'policy.write',
    'role.grant',
    'connector.manage',
    'audit.read',
  ]),
  ORG_ADMIN: new Set(['product.read', 'product.write', 'role.grant', 'connector.manage', 'audit.read']),
  OPERATOR: new Set(['product.read', 'product.write', 'campaign.propose']),
  APPROVER: new Set(['product.read', 'campaign.approve', 'price.change']),
  SUPPORT: new Set(['product.read', 'refund.issue']),
  ANALYST: new Set(['product.read', 'audit.read']),
  SERVICE_ACCOUNT: new Set(['product.read']),
  // Database administration is deliberately disjoint from every application power.
  DB_ADMIN: new Set(['db.admin']),
};

export interface Actor {
  actorId: string;
  roles: ReadonlySet<Role>;
}

export function can(actor: Actor, permission: Permission): boolean {
  for (const role of actor.roles) {
    if (ROLE_PERMISSIONS[role].has(permission)) return true;
  }
  return false;
}

/** Separation of duties: an approver cannot approve their own proposal. */
export function canApprove(actor: Actor, proposalActorId: string): boolean {
  return can(actor, 'campaign.approve') && actor.actorId !== proposalActorId;
}
