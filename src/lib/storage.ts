import type { StoredClaim } from "@/types/claim";

const KEY = "evidencelens.claims.v2";
const AUDIT_KEY = "evidencelens.audit.v2";

export interface AuditEntry {
  id: string;
  timestamp: string;
  claimId: string;
  actor: string;
  action: string;
  previousValue: string;
  newValue: string;
  reason: string;
  status: "ok" | "warning" | "error";
}

function isBrowser() {
  return typeof window !== "undefined";
}

function migrateStorage() {
  if (!isBrowser()) return;
  const migrated = window.localStorage.getItem("evidencelens.migrated.v2");
  if (!migrated) {
    window.localStorage.removeItem("evidencelens.claims.v1");
    window.localStorage.removeItem("evidencelens.audit.v1");
    window.localStorage.setItem("evidencelens.migrated.v2", "true");
  }
}

// Run migration on load
migrateStorage();

export function loadClaims(): StoredClaim[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveClaims(claims: StoredClaim[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(claims));
  window.dispatchEvent(new Event("evidencelens:claims"));
}

export function upsertClaim(claim: StoredClaim) {
  const claims = loadClaims();
  const idx = claims.findIndex((c) => c.claimId === claim.claimId);
  if (idx >= 0) claims[idx] = claim;
  else claims.unshift(claim);
  saveClaims(claims);
}

export function removeClaim(claimId: string) {
  const claims = loadClaims().filter((c) => c.claimId !== claimId);
  saveClaims(claims);
}

export function loadAudit(): AuditEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendAudit(entry: Omit<AuditEntry, "id" | "timestamp">) {
  if (!isBrowser()) return;
  const list = loadAudit();
  const full: AuditEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  list.unshift(full);
  window.localStorage.setItem(AUDIT_KEY, JSON.stringify(list.slice(0, 500)));
  window.dispatchEvent(new Event("evidencelens:audit"));
}
