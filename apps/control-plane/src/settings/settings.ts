/**
 * Hierarchical settings resolution.
 *
 * Effective settings resolve deterministically down a fixed scope chain — the
 * most specific scope that defines a key wins, with a stable tie-break. Every
 * resolution reports the winning scope and that layer's version so an action
 * receipt can record the exact effective setting version used.
 */

export const SCOPE_ORDER = [
  'platform',
  'organization',
  'workspace',
  'brand',
  'channel',
  'campaign',
  'action',
] as const;

export type Scope = (typeof SCOPE_ORDER)[number];

export interface SettingLayer {
  scope: Scope;
  scopeId: string; // '' for the platform layer
  version: string; // version of this layer's settings document
  values: Readonly<Record<string, unknown>>;
}

export interface ResolvedSetting<T = unknown> {
  key: string;
  value: T;
  sourceScope: Scope;
  sourceScopeId: string;
  version: string;
}

function scopeRank(scope: Scope): number {
  return SCOPE_ORDER.indexOf(scope);
}

export class SettingsResolver {
  private layers: SettingLayer[];

  constructor(layers: SettingLayer[]) {
    this.layers = layers;
  }

  resolve<T = unknown>(key: string): ResolvedSetting<T> | null {
    const candidates = this.layers
      .filter((l) => Object.prototype.hasOwnProperty.call(l.values, key))
      .sort((a, b) => {
        const byScope = scopeRank(b.scope) - scopeRank(a.scope); // most specific first
        if (byScope !== 0) return byScope;
        // Deterministic tie-break within the same scope level.
        if (a.scopeId < b.scopeId) return -1;
        if (a.scopeId > b.scopeId) return 1;
        return 0;
      });

    const winner = candidates[0];
    if (!winner) return null;
    return {
      key,
      value: winner.values[key] as T,
      sourceScope: winner.scope,
      sourceScopeId: winner.scopeId,
      version: winner.version,
    };
  }

  /** A composite effective-settings fingerprint for a receipt. */
  effectiveVersion(keys: string[]): string {
    return keys
      .map((k) => {
        const r = this.resolve(k);
        return `${k}=${r ? `${r.sourceScope}:${r.version}` : 'unset'}`;
      })
      .join('|');
  }
}
