import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadClaims } from "@/lib/storage";
import type { StoredClaim } from "@/types/claim";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { OBJECT_LABEL } from "@/lib/labels";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "Users & History · EvidenceLens AI" }] }),
  component: UsersPage,
});

interface UserAgg {
  userId: string;
  userName: string;
  total: number;
  accepted: number;
  rejected: number;
  manual: number;
  recent: number;
  riskLevel: "Low" | "Medium" | "High";
  lastClaim: string;
  claims: StoredClaim[];
}

function UsersPage() {
  const [claims, setClaims] = useState<StoredClaim[]>([]);
  useEffect(() => { setClaims(loadClaims()); }, []);

  const users: UserAgg[] = useMemo(() => {
    const map = new Map<string, UserAgg>();
    for (const c of claims) {
      const u = map.get(c.userId) ?? {
        userId: c.userId, userName: c.userName,
        total: 0, accepted: 0, rejected: 0, manual: 0, recent: 0,
        riskLevel: "Low", lastClaim: c.submittedAt, claims: [],
      };
      u.total += 1;
      if (c.result.claimStatus === "supported") u.accepted += 1;
      else if (c.result.claimStatus === "contradicted") u.rejected += 1;
      if (c.result.riskFlags.includes("manual_review_required")) u.manual += 1;
      const days = (Date.now() - new Date(c.submittedAt).getTime()) / 86400000;
      if (days <= 30) u.recent += 1;
      if (new Date(c.submittedAt) > new Date(u.lastClaim)) u.lastClaim = c.submittedAt;
      u.claims.push(c);
      map.set(c.userId, u);
    }
    return Array.from(map.values()).map((u) => ({
      ...u,
      riskLevel: u.rejected >= 2 || u.recent >= 3 ? "High" : u.rejected >= 1 || u.manual >= 1 ? "Medium" : "Low",
    }));
  }, [claims]);

  return (
    <div className="space-y-5">
      <p className="rounded-md border border-ai/30 bg-ai/5 p-3 text-sm" style={{ color: "var(--ai)" }}>
        User history is contextual risk information. It must not override clear visual evidence by itself.
      </p>
      <Card>
        <CardHeader><CardTitle className="text-base">Users ({users.length})</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2.5 text-left">User ID</th><th className="px-3 py-2.5 text-left">Name</th><th className="px-3 py-2.5 text-center">Total</th><th className="px-3 py-2.5 text-center">Accepted</th><th className="px-3 py-2.5 text-center">Rejected</th><th className="px-3 py-2.5 text-center">Manual</th><th className="px-3 py-2.5 text-center">Recent</th><th className="px-3 py-2.5 text-left">Risk</th><th className="px-3 py-2.5 text-left">Last claim</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.userId} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2.5 font-mono text-xs">{u.userId}</td>
                  <td className="px-3 py-2.5 font-medium">{u.userName}</td>
                  <td className="px-3 py-2.5 text-center">{u.total}</td>
                  <td className="px-3 py-2.5 text-center" style={{ color: "var(--success)" }}>{u.accepted}</td>
                  <td className="px-3 py-2.5 text-center" style={{ color: "var(--destructive)" }}>{u.rejected}</td>
                  <td className="px-3 py-2.5 text-center">{u.manual}</td>
                  <td className="px-3 py-2.5 text-center">{u.recent}</td>
                  <td className="px-3 py-2.5"><span className="rounded-full px-2 py-0.5 text-xs" style={{ color: u.riskLevel === "High" ? "var(--destructive)" : u.riskLevel === "Medium" ? "oklch(0.45 0.13 75)" : "var(--success)", backgroundColor: `color-mix(in oklab, ${u.riskLevel === "High" ? "var(--destructive)" : u.riskLevel === "Medium" ? "var(--warning)" : "var(--success)"} 12%, transparent)` }}>{u.riskLevel}</span></td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{format(new Date(u.lastClaim), "PP")}</td>
                  <td className="px-3 py-2.5 text-right"><UserDetail user={u} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function UserDetail({ user }: { user: UserAgg }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button size="sm" variant="ghost">View</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{user.userName} <span className="ml-2 font-mono text-xs text-muted-foreground">{user.userId}</span></DialogTitle></DialogHeader>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[["Total", user.total], ["Accepted", user.accepted], ["Rejected", user.rejected], ["Manual", user.manual]].map(([l, v]) => (
            <div key={l} className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="text-lg font-semibold">{v}</div></div>
          ))}
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Claim timeline</div>
          {user.claims.map((c) => (
            <div key={c.claimId} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm">
              <div><div className="font-mono text-xs text-muted-foreground">{c.claimId}</div><div className="font-medium">{c.claimTitle}</div><div className="text-xs text-muted-foreground">{OBJECT_LABEL[c.claimObject]} · {format(new Date(c.submittedAt), "PPp")}</div></div>
              <StatusBadge status={c.result.claimStatus} />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
