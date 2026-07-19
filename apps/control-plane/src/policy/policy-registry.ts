/**
 * Policy bundle registry.
 *
 * Policy is versioned. A DRAFT bundle can be edited; **activation deep-freezes
 * it and it is immutable thereafter**. Activating a new version retires the
 * previous active one. There is no active policy until one is activated — the
 * engine treats that as default-deny.
 */

export type PolicyStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';

export interface PolicyBundle {
  version: string;
  rules: Record<string, unknown>;
}

export class PolicyImmutabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyImmutabilityError';
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const key of Object.getOwnPropertyNames(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

interface Entry {
  bundle: PolicyBundle;
  status: PolicyStatus;
}

export class PolicyRegistry {
  private entries = new Map<string, Entry>();
  private activeVersion: string | null = null;

  registerDraft(bundle: PolicyBundle): void {
    if (this.entries.has(bundle.version)) {
      throw new PolicyImmutabilityError(`VERSION_EXISTS:${bundle.version}`);
    }
    this.entries.set(bundle.version, { bundle, status: 'DRAFT' });
  }

  activate(version: string): void {
    const entry = this.entries.get(version);
    if (!entry) throw new PolicyImmutabilityError(`UNKNOWN_VERSION:${version}`);
    if (entry.status === 'RETIRED') {
      throw new PolicyImmutabilityError(`RETIRED_CANNOT_REACTIVATE:${version}`);
    }

    deepFreeze(entry.bundle); // immutable from here on
    entry.status = 'ACTIVE';

    if (this.activeVersion && this.activeVersion !== version) {
      const previous = this.entries.get(this.activeVersion);
      if (previous) previous.status = 'RETIRED';
    }
    this.activeVersion = version;
  }

  getActiveVersion(): string | null {
    return this.activeVersion;
  }

  getActive(): PolicyBundle | null {
    if (!this.activeVersion) return null;
    return this.entries.get(this.activeVersion)?.bundle ?? null;
  }

  status(version: string): PolicyStatus | null {
    return this.entries.get(version)?.status ?? null;
  }
}
