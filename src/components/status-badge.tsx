import type { ClaimStatus, Severity, RiskFlag } from "@/types/claim";
import { STATUS_LABEL, SEVERITY_LABEL, RISK_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: ClaimStatus; className?: string }) {
  const tone =
    status === "supported"
      ? "bg-success/12 text-success border-success/30"
      : status === "contradicted"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : "bg-warning/15 text-warning-foreground border-warning/40";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tone,
        className,
      )}
      style={
        status === "supported"
          ? { color: "var(--success)", backgroundColor: "color-mix(in oklab, var(--success) 12%, transparent)", borderColor: "color-mix(in oklab, var(--success) 35%, transparent)" }
          : status === "contradicted"
          ? { color: "var(--destructive)", backgroundColor: "color-mix(in oklab, var(--destructive) 10%, transparent)", borderColor: "color-mix(in oklab, var(--destructive) 30%, transparent)" }
          : { color: "oklch(0.45 0.13 75)", backgroundColor: "color-mix(in oklab, var(--warning) 18%, transparent)", borderColor: "color-mix(in oklab, var(--warning) 40%, transparent)" }
      }
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "currentColor" }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const colors: Record<Severity, string> = {
    none: "var(--muted-foreground)",
    low: "var(--info)",
    medium: "var(--warning)",
    high: "var(--destructive)",
    unknown: "var(--muted-foreground)",
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{ color: colors[severity], borderColor: `color-mix(in oklab, ${colors[severity]} 35%, transparent)`, backgroundColor: `color-mix(in oklab, ${colors[severity]} 10%, transparent)` }}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function RiskChip({ risk }: { risk: RiskFlag }) {
  if (risk === "none") {
    return <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">No risks</span>;
  }
  const isCritical = risk === "possible_manipulation" || risk === "text_instruction_present" || risk === "manual_review_required";
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-xs font-medium"
      style={
        isCritical
          ? { color: "var(--destructive)", borderColor: "color-mix(in oklab, var(--destructive) 30%, transparent)", backgroundColor: "color-mix(in oklab, var(--destructive) 8%, transparent)" }
          : { color: "oklch(0.45 0.13 75)", borderColor: "color-mix(in oklab, var(--warning) 40%, transparent)", backgroundColor: "color-mix(in oklab, var(--warning) 15%, transparent)" }
      }
    >
      {RISK_LABEL[risk]}
    </span>
  );
}
