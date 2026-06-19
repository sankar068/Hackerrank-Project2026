import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EVIDENCE_RULES } from "@/data/evidenceRules";
import { OBJECT_LABEL } from "@/lib/labels";
import type { ClaimObject } from "@/types/claim";
import { Plus, Search, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/rules")({
  head: () => ({ meta: [{ title: "Evidence Rules · EvidenceLens AI" }] }),
  component: RulesPage,
});

function RulesPage() {
  const [q, setQ] = useState("");
  const filter = (obj: ClaimObject) =>
    EVIDENCE_RULES.filter(
      (r) =>
        r.object === obj &&
        (!q || (r.issueType + r.part + r.minimumEvidence).toLowerCase().includes(q.toLowerCase())),
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search rules by issue, part…"
            className="pl-8"
          />
        </div>
        <Button onClick={() => toast.info("Rule creation will be enabled in the admin build.")}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Rule
        </Button>
      </div>
      <Tabs defaultValue="car">
        <TabsList>
          {(["car", "laptop", "package"] as ClaimObject[]).map((o) => (
            <TabsTrigger key={o} value={o}>
              {OBJECT_LABEL[o]} Rules
            </TabsTrigger>
          ))}
        </TabsList>
        {(["car", "laptop", "package"] as ClaimObject[]).map((o) => (
          <TabsContent key={o} value={o} className="mt-4">
            <div className="grid gap-3 lg:grid-cols-2">
              {filter(o).map((r) => (
                <Card key={r.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">{r.issueType}</CardTitle>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {OBJECT_LABEL[r.object]} · {r.part}
                      </div>
                    </div>
                    <Badge variant="secondary">{r.status}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Minimum evidence
                      </div>
                      <p className="mt-1">{r.minimumEvidence}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-md border border-success/30 bg-success/5 p-2.5 text-xs">
                        <div
                          className="flex items-center gap-1 font-medium"
                          style={{ color: "var(--success)" }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Good example
                        </div>
                        <p className="mt-1 text-muted-foreground">{r.goodExample}</p>
                      </div>
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs">
                        <div
                          className="flex items-center gap-1 font-medium"
                          style={{ color: "var(--destructive)" }}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Insufficient example
                        </div>
                        <p className="mt-1 text-muted-foreground">{r.insufficientExample}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
