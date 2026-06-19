import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadAudit, type AuditEntry } from "@/lib/storage";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/audit")({
  head: () => ({ meta: [{ title: "Audit Logs · EvidenceLens AI" }] }),
  component: AuditPage,
});

function AuditPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("all");
  const [actor, setActor] = useState("all");

  useEffect(() => {
    setItems(loadAudit());
    const h = () => setItems(loadAudit());
    window.addEventListener("evidencelens:audit", h);
    return () => window.removeEventListener("evidencelens:audit", h);
  }, []);

  const actions = useMemo(() => Array.from(new Set(items.map((i) => i.action))), [items]);
  const actors = useMemo(() => Array.from(new Set(items.map((i) => i.actor))), [items]);

  const filtered = items.filter((i) => {
    if (action !== "all" && i.action !== action) return false;
    if (actor !== "all" && i.actor !== actor) return false;
    if (q && !`${i.claimId} ${i.reason} ${i.newValue}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by claim, reason, value" />
          <Select value={action} onValueChange={setAction}><SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All actions</SelectItem>{actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={actor} onValueChange={setActor}><SelectTrigger><SelectValue placeholder="Actor" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All actors</SelectItem>{actors.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Append-only audit log ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2.5 text-left">Timestamp</th><th className="px-3 py-2.5 text-left">Claim ID</th><th className="px-3 py-2.5 text-left">Actor</th><th className="px-3 py-2.5 text-left">Action</th><th className="px-3 py-2.5 text-left">Previous</th><th className="px-3 py-2.5 text-left">New</th><th className="px-3 py-2.5 text-left">Reason</th><th className="px-3 py-2.5 text-left">Status</th></tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-border align-top">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(e.timestamp), "PPp")}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{e.claimId}</td>
                  <td className="px-3 py-2.5">{e.actor}</td>
                  <td className="px-3 py-2.5">{e.action}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.previousValue}</td>
                  <td className="px-3 py-2.5 text-xs font-medium">{e.newValue}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.reason}</td>
                  <td className="px-3 py-2.5"><span className="rounded-full px-2 py-0.5 text-xs" style={{ color: e.status === "ok" ? "var(--success)" : e.status === "warning" ? "oklch(0.45 0.13 75)" : "var(--destructive)", backgroundColor: `color-mix(in oklab, ${e.status === "ok" ? "var(--success)" : e.status === "warning" ? "var(--warning)" : "var(--destructive)"} 12%, transparent)` }}>{e.status}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-12 text-center text-sm text-muted-foreground">No audit entries.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
