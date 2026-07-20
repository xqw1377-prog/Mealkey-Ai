/**
 * Risk Runtime — profile.openRiskAlerts 读写
 */

import type { RiskAlert, RiskAlertStatus } from "../../contracts/risk-runtime";

export function listOpenRiskAlerts(
  profile: Record<string, unknown>,
): RiskAlert[] {
  const raw = profile.openRiskAlerts;
  if (!Array.isArray(raw)) return [];
  return (raw as RiskAlert[]).filter(
    (a) => a && a.status !== "resolved" && a.id,
  );
}

export function upsertOpenRiskAlert(
  profile: Record<string, unknown>,
  alert: RiskAlert,
): Record<string, unknown> {
  const existing = Array.isArray(profile.openRiskAlerts)
    ? ([...profile.openRiskAlerts] as RiskAlert[])
    : [];
  const idx = existing.findIndex(
    (a) =>
      a.id === alert.id ||
      (a.title === alert.title &&
        a.type === alert.type &&
        a.status !== "resolved"),
  );
  if (idx >= 0) {
    existing[idx] = { ...existing[idx], ...alert };
  } else {
    existing.unshift(alert);
  }
  return {
    ...profile,
    openRiskAlerts: existing.slice(0, 20),
  };
}

export function updateRiskAlertStatus(
  profile: Record<string, unknown>,
  riskId: string,
  status: RiskAlertStatus,
): Record<string, unknown> {
  const existing = Array.isArray(profile.openRiskAlerts)
    ? (profile.openRiskAlerts as RiskAlert[])
    : [];
  return {
    ...profile,
    openRiskAlerts: existing.map((a) =>
      a.id === riskId ? { ...a, status } : a,
    ),
  };
}

export function mergeRiskAlertsIntoProfile(
  profile: Record<string, unknown>,
  alerts: RiskAlert[],
): Record<string, unknown> {
  let next = profile;
  for (const alert of alerts) {
    next = upsertOpenRiskAlert(next, alert);
  }
  return next;
}
