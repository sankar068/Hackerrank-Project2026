import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, RiskChip } from "@/components/status-badge";
import { OBJECT_LABEL } from "@/lib/labels";
import { loadClaims, appendAudit } from "@/lib/storage";
import type { StoredClaim, ClaimStatus, RiskFlag } from "@/types/claim";
import { Eye, ShieldCheck, MessageSquare, Inbox } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/queue")({
  head: () => ({ meta: [{ title: "Review Queue · EvidenceLens AI" }] }),
  component: QueuePage,
});

const TABS: Array<{ k: string; label: string; predicate: (c: StoredClaim) => boolean }> = [
  {
    k: "all",
    label: "All flagged",
    predicate: (c) => c.result.riskFlags.some((r) => r !== "none"),
  },
  {
    k: "manual",
    label: "Manual review",
    predicate: (c) => c.result.riskFlags.includes("manual_review_required"),
  },
  {
    k: "quality",
    label: "Image quality",
    predicate: (c) =>
      c.result.riskFlags.some((r) =>
        ["blurry_image", "cropped_or_obstructed", "low_light_or_glare", "wrong_angle"].includes(
          r as string,
        ),
      ),
  },
  {
    k: "authenticity",
    label: "Authenticity",
    predicate: (c) =>
      c.result.riskFlags.some((r) =>
        ["possible_manipulation", "non_original_image"].includes(r as string),
      ),
  },
  {
    k: "history",
    label: "User-history risks",
    predicate: (c) => c.result.riskFlags.includes("user_history_risk"),
  },
  {
    k: "injection",
    label: "Prompt injection",
    predicate: (c) => c.result.riskFlags.includes("text_instruction_present"),
  },
];

function QueuePage() {
  const [claims, setClaims] = useState<StoredClaim[]>([]);
  useEffect(() => {
    setClaims(loadClaims());
    const h = () => setClaims(loadClaims());
    window.addEventListener("evidencelens:claims", h);
    return () => window.removeEventListener("evidencelens:claims", h);
  }, []);

  return (
    <div className="space-y-5">
      <p
        className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm"
        style={{ color: "oklch(0.4 0.13 75)" }}
      >
        Human reviewers retain final authority for high-risk or inconclusive cases.
      </p>
      <Tabs defaultValue="all">
        <TabsList className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.k} value={t.k}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => {
          const list = claims.filter(t.predicate);
          return (
            <TabsContent key={t.k} value={t.k} className="mt-4">
              {list.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center text-sm text-muted-foreground">
                    <Inbox className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    No items in this queue.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {list.map((c) => (
                    <QueueCard key={c.claimId} claim={c} />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function QueueCard({ claim }: { claim: StoredClaim }) {
  const r = claim.result;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <div className="font-mono text-xs text-muted-foreground">{claim.claimId}</div>
          <CardTitle className="mt-0.5 text-base">{claim.claimTitle}</CardTitle>
          <div className="mt-1 text-xs text-muted-foreground">
            {claim.userName} · {OBJECT_LABEL[claim.claimObject]}
          </div>
        </div>
        <StatusBadge status={r.claimStatus} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-1.5">
          {r.riskFlags.map((f) => (
            <RiskChip key={f} risk={f} />
          ))}
        </div>
        <p className="text-muted-foreground">{r.claimStatusJustification}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Assigned reviewer:{" "}
            <span className="font-medium text-foreground">Review Administrator</span>
          </span>
          <span>
            Status: <span className="font-medium text-foreground">Pending</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm" variant="outline">
            <Link to="/result/$claimId" params={{ claimId: claim.claimId }}>
              <Eye className="mr-1.5 h-4 w-4" />
              View
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              appendAudit({
                claimId: claim.claimId,
                actor: "review.admin",
                action: "AI decision approved",
                previousValue: r.claimStatus,
                newValue: r.claimStatus,
                reason: "Reviewer confirmed",
                status: "ok",
              });
              toast.success("Approved AI decision");
            }}
          >
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            Approve
          </Button>
          <OverrideDialog claim={claim} />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              appendAudit({
                claimId: claim.claimId,
                actor: "review.admin",
                action: "More evidence requested",
                previousValue: "—",
                newValue: "evidence_requested",
                reason: "Reviewer requested clarification",
                status: "warning",
              });
              toast.message("Reviewer requested more evidence");
            }}
          >
            <MessageSquare className="mr-1.5 h-4 w-4" />
            Request evidence
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OverrideDialog({ claim }: { claim: StoredClaim }) {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<ClaimStatus>(claim.result.claimStatus);
  const [reason, setReason] = useState("");
  const [name, setName] = useState("Review Administrator");
  const submit = () => {
    if (!reason.trim()) {
      toast.error("Reviewer reason is required");
      return;
    }
    appendAudit({
      claimId: claim.claimId,
      actor: name,
      action: "Decision overridden",
      previousValue: claim.result.claimStatus,
      newValue: decision,
      reason,
      status: "warning",
    });
    toast.success("Decision overridden");
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Override
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override AI decision</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>New decision</Label>
            <Select value={decision} onValueChange={(v) => setDecision(v as ClaimStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supported">Supported</SelectItem>
                <SelectItem value="contradicted">Contradicted</SelectItem>
                <SelectItem value="not_enough_information">Not enough information</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reviewer reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Reviewer name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Submit override</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { RiskFlag };
