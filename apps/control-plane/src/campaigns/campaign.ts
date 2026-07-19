import { requireTenant } from '../security/tenant-context.ts';

/**
 * Campaign — a bounded orchestration that groups the action proposals working
 * toward one commercial objective.
 *
 * Lifecycle: DRAFT → ACTIVE → (PAUSED ↔ ACTIVE) → COMPLETED, with CANCELLED
 * reachable from any non-terminal state. Proposals may be added while the
 * campaign is non-terminal; a campaign cannot be activated empty. All state is
 * tenant-bound and fails closed across tenants.
 */

export type CampaignState = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export class CampaignError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CampaignError';
  }
}

export class Campaign {
  readonly campaignId: string;
  readonly tenantId: string;
  readonly objective: string;
  private _state: CampaignState;
  private _members: Set<string>;

  constructor(campaignId: string, objective: string) {
    if (!campaignId || typeof campaignId !== 'string') throw new CampaignError('CAMPAIGN_ID_INVALID');
    this.tenantId = requireTenant();
    this.campaignId = campaignId;
    this.objective = objective;
    this._state = 'DRAFT';
    this._members = new Set();
  }

  private assertOwnTenant(): void {
    if (requireTenant() !== this.tenantId) throw new CampaignError('CROSS_TENANT_DENIED');
  }

  private isTerminal(): boolean {
    return this._state === 'COMPLETED' || this._state === 'CANCELLED';
  }

  addProposal(proposalKey: string): void {
    this.assertOwnTenant();
    if (this.isTerminal()) throw new CampaignError(`CAMPAIGN_TERMINAL:${this._state}`);
    if (!proposalKey) throw new CampaignError('PROPOSAL_KEY_INVALID');
    this._members.add(proposalKey);
  }

  activate(): void {
    this.assertOwnTenant();
    if (this._state !== 'DRAFT') throw new CampaignError(`NOT_DRAFT:${this._state}`);
    if (this._members.size === 0) throw new CampaignError('EMPTY_CAMPAIGN');
    this._state = 'ACTIVE';
  }

  pause(): void {
    this.assertOwnTenant();
    if (this._state !== 'ACTIVE') throw new CampaignError(`NOT_ACTIVE:${this._state}`);
    this._state = 'PAUSED';
  }

  resume(): void {
    this.assertOwnTenant();
    if (this._state !== 'PAUSED') throw new CampaignError(`NOT_PAUSED:${this._state}`);
    this._state = 'ACTIVE';
  }

  complete(): void {
    this.assertOwnTenant();
    if (this._state !== 'ACTIVE' && this._state !== 'PAUSED') throw new CampaignError(`NOT_RUNNING:${this._state}`);
    this._state = 'COMPLETED';
  }

  cancel(): void {
    this.assertOwnTenant();
    if (this.isTerminal()) throw new CampaignError(`CAMPAIGN_TERMINAL:${this._state}`);
    this._state = 'CANCELLED';
  }

  state(): CampaignState {
    this.assertOwnTenant();
    return this._state;
  }

  members(): string[] {
    this.assertOwnTenant();
    return Array.from(this._members);
  }

  size(): number {
    this.assertOwnTenant();
    return this._members.size;
  }
}
