import type { ClaimInput, ReviewResult } from "@/types/claim";

const COLUMNS = [
  "user_id",
  "image_paths",
  "user_claim",
  "claim_object",
  "evidence_standard_met",
  "evidence_standard_met_reason",
  "risk_flags",
  "issue_type",
  "object_part",
  "claim_status",
  "claim_status_justification",
  "supporting_image_ids",
  "valid_image",
  "severity",
] as const;

function csvEscape(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function buildCsvRow(input: ClaimInput, result: ReviewResult): Record<string, string> {
  const userClaim = input.conversation.map((m) => `${m.role}: ${m.text}`).join(" | ");
  return {
    user_id: input.userId,
    image_paths: input.images.map((i) => i.name).join(";") || "none",
    user_claim: userClaim || "none",
    claim_object: result.claimObject,
    evidence_standard_met: String(result.evidenceStandardMet),
    evidence_standard_met_reason: result.evidenceStandardMetReason || "none",
    risk_flags: (result.riskFlags.length ? result.riskFlags : ["none"]).join(";"),
    issue_type: result.issueType,
    object_part: result.objectPart || "none",
    claim_status: result.claimStatus,
    claim_status_justification: result.claimStatusJustification || "none",
    supporting_image_ids: result.supportingImageIds.join(";") || "none",
    valid_image: String(result.validImage),
    severity: result.severity,
  };
}

export function exportResultCsv(input: ClaimInput, result: ReviewResult, filename = "output.csv") {
  const row = buildCsvRow(input, result);
  const header = COLUMNS.join(",");
  const body = COLUMNS.map((c) => csvEscape(row[c])).join(",");
  const csv = `${header}\n${body}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function csvPreview(input: ClaimInput, result: ReviewResult) {
  const row = buildCsvRow(input, result);
  const header = COLUMNS.join(",");
  const body = COLUMNS.map((c) => csvEscape(row[c])).join(",");
  return `${header}\n${body}`;
}

export const CSV_COLUMNS = COLUMNS;
