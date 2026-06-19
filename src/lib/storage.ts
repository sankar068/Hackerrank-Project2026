import type { StoredClaim } from "@/types/claim";
import { DEMO_CLAIMS } from "@/data/demoClaims";

const KEY = "evidencelens.claims.v1";
const AUDIT_KEY = "evidencelens.audit.v1";

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

function isBrowser() { return typeof window !== "undefined"; }

export function loadClaims(): StoredClaim[] {
  if (!isBrowser()) return DEMO_CLAIMS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEMO_CLAIMS;
    const parsed = JSON.parse(raw) as StoredClaim[];
    return Array.isArray(parsed) && parsed.length ? parsed : DEMO_CLAIMS;
  } catch {
    return DEMO_CLAIMS;
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
  if (idx >= 0) claims[idx] = claim; else claims.unshift(claim);
  saveClaims(claims);
}

export function removeClaim(claimId: string) {
  const claims = loadClaims().filter((c) => c.claimId !== claimId);
  saveClaims(claims);
}

export function loadAudit(): AuditEntry[] {
  if (!isBrowser()) return DEFAULT_AUDIT;
  try {
    const raw = window.localStorage.getItem(AUDIT_KEY);
    if (!raw) return DEFAULT_AUDIT;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_AUDIT;
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

const DEFAULT_AUDIT: AuditEntry[] = [
  { id: "a1", timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(), claimId: "CLM-10421", actor: "system", action: "AI review started", previousValue: "—", newValue: "in_progress", reason: "Reviewer triggered run", status: "ok" },
  { id: "a2", timestamp: new Date(Date.now() - 1000 * 60 * 11).toISOString(), claimId: "CLM-10421", actor: "system", action: "Decision generated", previousValue: "in_progress", newValue: "supported", reason: "Evidence matches claim", status: "ok" },
  { id: "a3", timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), claimId: "CLM-10387", actor: "system", action: "Risk flag added", previousValue: "[]", newValue: "text_instruction_present", reason: "Embedded instruction in conversation", status: "warning" },
  { id: "a4", timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), claimId: "CLM-10374", actor: "review.admin", action: "Human review requested", previousValue: "supported", newValue: "supported (manual review)", reason: "User-history risk", status: "warning" },
  { id: "a5", timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), claimId: "CLM-10399", actor: "review.admin", action: "CSV exported", previousValue: "—", newValue: "output.csv", reason: "Export requested", status: "ok" },
];
