import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { StoredClaim } from "@/types/claim";
import { loadClaims, appendAudit } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatusBadge, SeverityBadge, RiskChip } from "@/components/status-badge";
import { OBJECT_LABEL, ISSUE_LABEL } from "@/lib/labels";
import { CheckCircle2, XCircle, AlertTriangle, Download, ArrowLeft, ChevronDown, ShieldAlert, FileJson } from "lucide-react";
import { exportResultCsv, csvPreview } from "@/utils/csvExport";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/result/$claimId")({
  head: () => ({ meta: [{ title: "Review Result · EvidenceLens AI" }] }),
  component: ResultPage,
});

function ResultPage() {
  const { claimId } = useParams({ from: "/_app/result/$claimId" });
  const [claim, setClaim] = useState<StoredClaim | null>(null);

  useEffect(() => {
    const all = loadClaims();
    setClaim(all.find((c) => c.claimId === claimId) ?? null);
  }, [claimId]);

  if (!claim) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Claim not found.
          <div className="mt-4"><Button asChild variant="outline"><Link to="/claims">Back to claims</Link></Button></div>
        </CardContent>
      </Card>
    );
  }

  const { result } = claim;
  const bannerCfg = result.claimStatus === "supported"
    ? { Icon: CheckCircle2, text: "The submitted images support the user's claim.", bg: "var(--success)" }
    : result.claimStatus === "contradicted"
    ? { Icon: XCircle, text: "The visible image evidence contradicts the user's claim.", bg: "var(--destructive)" }
    : { Icon: AlertTriangle, text: "The submitted images do not provide enough information to verify the claim.", bg: "var(--warning)" };

  const onExport = () => {
    exportResultCsv(claim, result);
    appendAudit({ claimId: claim.claimId, actor: "review.admin", action: "CSV exported", previousValue: "—", newValue: "output.csv", reason: "Export requested", status: "ok" });
    toast.success("output.csv downloaded");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm"><Link to="/claims"><ArrowLeft className="mr-1.5 h-4 w-4" />All claims</Link></Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onExport}><Download className="mr-1.5 h-4 w-4" /> Export CSV</Button>
        </div>
      </div>

      {/* Banner */}
      <div className="rounded-2xl p-5 text-white shadow-elevated" style={{ background: `linear-gradient(135deg, ${bannerCfg.bg}, color-mix(in oklab, ${bannerCfg.bg} 70%, black))` }}>
        <div className="flex items-start gap-4">
          <bannerCfg.Icon className="h-9 w-9 shrink-0" />
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider opacity-80">Final decision</div>
            <div className="text-xl font-semibold md:text-2xl">{bannerCfg.text}</div>
            <div className="mt-1 text-sm opacity-90">{result.claimStatusJustification}</div>
          </div>
          <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[11px] font-medium">Simulated Demo Result</span>
        </div>
      </div>

      {/* Result fields */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FieldCard label="Claim ID" value={result.claimId} mono />
        <FieldCard label="User ID" value={result.userId} mono />
        <FieldCard label="Object" value={OBJECT_LABEL[result.claimObject]} />
        <FieldCard label="Status">
          <StatusBadge status={result.claimStatus} />
        </FieldCard>
        <FieldCard label="Evidence standard met" value={result.evidenceStandardMet ? "True" : "False"} valueColor={result.evidenceStandardMet ? "var(--success)" : "var(--destructive)"} />
        <FieldCard label="Valid image" value={result.validImage ? "True" : "False"} valueColor={result.validImage ? "var(--success)" : "var(--destructive)"} />
        <FieldCard label="Issue type" value={ISSUE_LABEL[result.issueType]} />
        <FieldCard label="Object part" value={result.objectPart || "—"} />
        <FieldCard label="Severity"><SeverityBadge severity={result.severity} /></FieldCard>
        <FieldCard label="Supporting image IDs" value={result.supportingImageIds.join(", ") || "none"} mono />
        <FieldCard label="Reviewed" value={new Date(result.reviewedAt).toLocaleString()} />
        <FieldCard label="Evidence standard reason" value={result.evidenceStandardMetReason} fullSpan />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Extracted Claim</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Claimed object" value={result.extractedClaim.claimedObject} />
            <Row label="Claimed issue" value={result.extractedClaim.claimedIssue} />
            <Row label="Claimed part" value={result.extractedClaim.claimedPart} />
            {result.extractedClaim.locationQualifier && <Row label="Location qualifier" value={result.extractedClaim.locationQualifier} />}
            {result.extractedClaim.excludedParts.length > 0 && (
              <Row label="Excluded parts" value={result.extractedClaim.excludedParts.join(", ")} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Evidence Requirement Check</CardTitle></CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <div className="rounded-md bg-muted p-2.5 text-xs"><b>Expected:</b> {result.minimumEvidenceExpected}</div>
            {result.evidenceChecks.map((c) => (
              <div key={c.label} className="flex items-center justify-between">
                <span>{c.label}</span>
                <span className="flex items-center gap-1 text-xs font-medium" style={{ color: c.passed ? "var(--success)" : "var(--destructive)" }}>
                  {c.passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {c.passed ? "Passed" : "Failed"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Risk Analysis</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {result.riskFlags.map((r) => <RiskChip key={r} risk={r} />)}
            </div>
            <Separator />
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Severity scale</div>
              <SeverityScale severity={result.severity} />
            </div>
            {result.riskFlags.includes("text_instruction_present") && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs" style={{ color: "var(--destructive)" }}>
                Security alert: embedded instructions detected in the conversation. They were ignored by the review engine.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Image Evidence Review</CardTitle></CardHeader>
        <CardContent>
          {claim.images.length === 0 ? (
            <p className="text-sm text-muted-foreground">No images were submitted.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {claim.images.map((img) => {
                const r = result.imageReviews.find((x) => x.imageId === img.id);
                const supports = result.supportingImageIds.includes(img.id);
                return (
                  <div key={img.id} className={`rounded-xl border bg-card p-3 ${supports ? "border-primary ring-1 ring-primary/20" : "border-border"}`}>
                    {img.dataUrl && (
                      <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                        <img src={img.dataUrl} alt={img.name} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-mono">{img.id.slice(0, 10)}</span>
                      {supports && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Supporting</span>}
                    </div>
                    {r && (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <div><span className="text-foreground font-medium">Object:</span> {r.detectedObject} · <span className="font-medium text-foreground">Part:</span> {r.detectedPart}</div>
                        <div><span className="text-foreground font-medium">Quality:</span> {r.imageQuality} · <span className="font-medium text-foreground">Relevance:</span> {r.evidenceRelevance}</div>
                        <p className="mt-1 italic">{r.observation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Decision Reasoning</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 text-sm">
          <Reason title="What the user claimed" body={result.reasoning.claimed} />
          <Reason title="What the images show" body={result.reasoning.observed} />
          <Reason title="Why this decision" body={result.reasoning.decision} />
        </CardContent>
      </Card>

      <Collapsible className="rounded-xl border border-border bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left">
          <span className="font-semibold">Understanding the decision</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border px-4 py-4 text-sm space-y-3">
          <Concept t="Evidence Standard Met" d="Whether the images contain enough information to evaluate the claim." />
          <Concept t="Valid Image" d="Whether the submitted image is usable and trustworthy for automated evidence review." />
          <Concept t="Claim Status" d="The final decision about whether the images support, contradict or cannot verify the claim." />
          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">Evidence sufficiency, image validity and claim truth are separate concepts.</p>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible className="rounded-xl border border-border bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left">
          <span className="font-semibold flex items-center gap-2"><FileJson className="h-4 w-4" /> CSV preview</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border p-4">
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">{csvPreview(claim, result)}</pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function FieldCard({ label, value, children, mono, fullSpan, valueColor }: { label: string; value?: string; children?: React.ReactNode; mono?: boolean; fullSpan?: boolean; valueColor?: string }) {
  return (
    <Card className={fullSpan ? "md:col-span-2 lg:col-span-4" : ""}>
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-1.5 text-sm font-medium ${mono ? "font-mono" : ""}`} style={valueColor ? { color: valueColor } : undefined}>
          {children ?? value}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}

function Reason({ title, body }: { title: string; body: string }) {
  return <div><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div><p className="mt-1.5">{body}</p></div>;
}

function Concept({ t, d }: { t: string; d: string }) {
  return <div><div className="font-medium">{t}</div><p className="text-muted-foreground">{d}</p></div>;
}

function SeverityScale({ severity }: { severity: import("@/types/claim").Severity }) {
  const levels: Array<{ k: import("@/types/claim").Severity; color: string }> = [
    { k: "none", color: "var(--muted-foreground)" },
    { k: "low", color: "var(--info)" },
    { k: "medium", color: "var(--warning)" },
    { k: "high", color: "var(--destructive)" },
  ];
  const idx = levels.findIndex((l) => l.k === severity);
  return (
    <div className="flex gap-1">
      {levels.map((l, i) => (
        <div key={l.k} className="h-2 flex-1 rounded-full" style={{ backgroundColor: i <= idx && idx >= 0 ? l.color : "var(--muted)" }} />
      ))}
    </div>
  );
}
