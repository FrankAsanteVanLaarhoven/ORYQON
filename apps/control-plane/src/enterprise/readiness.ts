import { requireTenant } from '../security/tenant-context.ts';

/**
 * Enterprise deployment readiness.
 *
 * A deterministic, fail-closed posture check over a tenant's enterprise
 * configuration: data residency within the permitted set, SSO enforced,
 * customer-managed encryption keys, audit export enabled, RBAC propose/approve
 * separation, and a minimum assurance level. Any unmet requirement is a gap and
 * the deployment is NOT ready. Nothing external is contacted — this evaluates
 * declared configuration only.
 */

export interface EnterpriseConfig {
  residencyRegion: string;
  allowedResidencyRegions: string[];
  ssoEnforced: boolean;
  customerManagedKeys: boolean;
  auditExportEnabled: boolean;
  rbacSeparationEnforced: boolean;
  minAAL: number;
}

export interface ReadinessGap {
  id: string;
  detail: string;
}

export interface ReadinessResult {
  ready: boolean;
  gaps: ReadinessGap[];
  checked: string[];
}

export class EnterpriseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnterpriseError';
  }
}

const REQUIRED_MIN_AAL = 2;

export function evaluateReadiness(config: EnterpriseConfig): ReadinessResult {
  const gaps: ReadinessGap[] = [];
  const checked: string[] = [];
  const check = (id: string, ok: boolean, detail: string): void => {
    checked.push(id);
    if (!ok) gaps.push({ id, detail });
  };

  check(
    'residency',
    config.allowedResidencyRegions.includes(config.residencyRegion),
    `residency region ${config.residencyRegion} is not in the permitted set`,
  );
  check('sso', config.ssoEnforced === true, 'SSO is not enforced');
  check('cmk', config.customerManagedKeys === true, 'customer-managed encryption keys are not enabled');
  check('audit_export', config.auditExportEnabled === true, 'audit export is not enabled');
  check('rbac_separation', config.rbacSeparationEnforced === true, 'RBAC propose/approve separation is not enforced');
  check('aal', Number.isInteger(config.minAAL) && config.minAAL >= REQUIRED_MIN_AAL, `minimum AAL is below ${REQUIRED_MIN_AAL}`);

  return { ready: gaps.length === 0, gaps, checked };
}

/** Tenant-scoped hold for enterprise configuration; readiness fails closed with no config. */
export class EnterpriseConfigStore {
  private byTenant = new Map<string, EnterpriseConfig>();

  set(config: EnterpriseConfig): void {
    const tenantId = requireTenant();
    this.byTenant.set(tenantId, { ...config, allowedResidencyRegions: [...config.allowedResidencyRegions] });
  }

  get(): EnterpriseConfig | null {
    const c = this.byTenant.get(requireTenant());
    return c ? { ...c, allowedResidencyRegions: [...c.allowedResidencyRegions] } : null;
  }

  readiness(): ReadinessResult {
    const config = this.get();
    if (!config) {
      return { ready: false, gaps: [{ id: 'config', detail: 'no enterprise configuration set' }], checked: ['config'] };
    }
    return evaluateReadiness(config);
  }
}
