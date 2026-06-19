import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CSV_COLUMNS } from "@/utils/csvExport";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings · EvidenceLens AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [policy, setPolicy] = useState({
    autoManualHighRisk: true, requireApprovalContradicted: true, requireApprovalManipulation: true, requireMoreEvidenceMissing: true,
  });
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card>
        <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>Organisation name</Label><Input defaultValue="Northwind Claims Co." /></div>
          <div><Label>Default reviewer</Label><Input defaultValue="Review Administrator" /></div>
          <div><Label>Time zone</Label>
            <Select defaultValue="utc"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="utc">UTC</SelectItem><SelectItem value="cet">CET</SelectItem><SelectItem value="pst">PST</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Date format</Label>
            <Select defaultValue="iso"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="iso">YYYY-MM-DD</SelectItem><SelectItem value="us">MM/DD/YYYY</SelectItem><SelectItem value="eu">DD/MM/YYYY</SelectItem></SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Review Policy</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            ["autoManualHighRisk", "Automatically send high-risk claims to manual review"],
            ["requireApprovalContradicted", "Require reviewer approval for contradicted claims"],
            ["requireApprovalManipulation", "Require reviewer approval for possible manipulation"],
            ["requireMoreEvidenceMissing", "Require additional evidence for missing-content claims"],
          ].map(([k, l]) => (
            <div key={k} className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm">{l}</span>
              <Switch checked={(policy as never)[k]} onCheckedChange={(v) => setPolicy({ ...policy, [k]: v })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Model Configuration</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 opacity-70">
          <div><Label>Vision model provider</Label><Input disabled defaultValue="—" /></div>
          <div><Label>Language model provider</Label><Input disabled defaultValue="—" /></div>
          <div><Label>Model name</Label><Input disabled defaultValue="—" /></div>
          <div><Label>Temperature</Label><Input disabled defaultValue="0.0" /></div>
          <div><Label>Maximum retries</Label><Input disabled defaultValue="3" /></div>
          <div><Label>Request timeout (s)</Label><Input disabled defaultValue="30" /></div>
        </CardContent>
        <div className="px-6 pb-6 text-xs text-muted-foreground">Model integration will be connected to the production backend later.</div>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Output Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground">Required output columns (exact order):</div>
          <div className="flex flex-wrap gap-1.5">
            {CSV_COLUMNS.map((c) => <code key={c} className="rounded-md border border-border bg-muted px-2 py-1 text-[11px]">{c}</code>)}
          </div>
          <Button variant="outline" size="sm" disabled>Preview CSV export</Button>
        </CardContent>
      </Card>

      <Collapsible className="rounded-xl border border-border bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left">
          <span className="font-semibold">How the production system will work</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border p-4 text-sm">
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">{`Frontend dashboard
  ↓
FastAPI claim-review endpoint
  ↓
Conversation claim extractor
  ↓
Image evidence reviewer
  ↓
Evidence-rule validator
  ↓
User-history analyser
  ↓
Decision engine
  ↓
Schema validator
  ↓
output.csv generator`}</pre>
          <ul className="mt-3 space-y-1 text-muted-foreground text-xs list-disc pl-5">
            <li>Mock service currently active</li>
            <li>Production backend not yet connected</li>
            <li>No external AI model currently called</li>
            <li>Uploaded images remain inside the browser demo</li>
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
