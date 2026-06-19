import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadClaims } from "@/lib/storage";
import type { StoredClaim } from "@/types/claim";
import { StatusBadge, SeverityBadge, RiskChip } from "@/components/status-badge";
import { OBJECT_LABEL } from "@/lib/labels";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { ArrowRight, ServerCog, CheckCircle2, Database } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/overview")({
  head: () => ({ meta: [{ title: "Overview · EvidenceLens AI" }] }),
  component: Overview,
});

function EmptyChart() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Database className="mb-2 h-8 w-8 text-muted-foreground/50" />
      <p className="text-sm font-medium text-muted-foreground">No claim data is available yet.</p>
    </div>
  );
}

function Overview() {
  const [claims, setClaims] = useState<StoredClaim[]>([]);
  useEffect(() => {
    setClaims(loadClaims());
    const h = () => setClaims(loadClaims());
    window.addEventListener("evidencelens:claims", h);
    return () => window.removeEventListener("evidencelens:claims", h);
  }, []);

  const metrics = useMemo(() => {
    let supported = 0,
      contradicted = 0,
      noInfo = 0,
      manual = 0;
    claims.forEach((c) => {
      if (c.result?.claimStatus === "supported") supported++;
      if (c.result?.claimStatus === "contradicted") contradicted++;
      if (c.result?.claimStatus === "not_enough_information") noInfo++;
      if (c.result?.claimStatus === "manual_review") manual++;
    });

    return [
      { label: "Total Claims", value: claims.length },
      { label: "Supported", value: supported, color: "var(--success)" },
      { label: "Contradicted", value: contradicted, color: "var(--destructive)" },
      { label: "Not Enough Information", value: noInfo, color: "var(--warning)" },
      { label: "Manual Review Required", value: manual, color: "var(--ai)" },
      { label: "Average Review Time", value: "—" },
    ];
  }, [claims]);

  const pie = useMemo(() => {
    const s = metrics[1].value as number;
    const c = metrics[2].value as number;
    const n = metrics[3].value as number;
    if (s === 0 && c === 0 && n === 0) return [];
    return [
      { name: "Supported", value: s, color: "var(--success)" },
      { name: "Contradicted", value: c, color: "var(--destructive)" },
      { name: "Not Enough Info", value: n, color: "var(--warning)" },
    ].filter((x) => x.value > 0);
  }, [metrics]);

  const bars = useMemo(() => {
    const counts: Record<string, number> = { Car: 0, Laptop: 0, Package: 0 };
    claims.forEach((c) => {
      const lbl = OBJECT_LABEL[c.claimObject];
      if (lbl) counts[lbl] = (counts[lbl] || 0) + 1;
    });
    const result = Object.entries(counts).map(([name, value]) => ({ name, value }));
    if (result.every((r) => r.value === 0)) return [];
    return result;
  }, [claims]);

  const recent = useMemo(() => claims.slice(0, 6), [claims]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((m) => (
          <Card key={m.label} className="shadow-soft">
            <CardContent className="p-5">
              <div className="text-xs font-medium text-muted-foreground">{m.label}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <div
                  className="text-2xl font-semibold"
                  style={m.color ? { color: m.color } : undefined}
                >
                  {m.value}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Claim Decision Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {pie.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pie}
                      dataKey="value"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {pie.map((p) => (
                        <Cell key={p.name} fill={p.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
                  {pie.map((p) => (
                    <span key={p.name} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Claims by Object Type</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {bars.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Claims</CardTitle>
            {recent.length > 0 && (
              <Button asChild size="sm" variant="ghost">
                <Link to="/claims">
                  View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className={recent.length === 0 ? "h-64" : "p-0"}>
            {recent.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Claim ID</th>
                      <th className="px-4 py-2.5 text-left">User</th>
                      <th className="px-4 py-2.5 text-left">Object</th>
                      <th className="px-4 py-2.5 text-left">Damage</th>
                      <th className="px-4 py-2.5 text-left">Status</th>
                      <th className="px-4 py-2.5 text-left">Severity</th>
                      <th className="px-4 py-2.5 text-left">Submitted</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((c) => (
                      <tr key={c.claimId} className="border-t border-border">
                        <td className="px-4 py-2.5 font-mono text-xs">{c.claimId}</td>
                        <td className="px-4 py-2.5">{c.userName || c.userId || "—"}</td>
                        <td className="px-4 py-2.5">{OBJECT_LABEL[c.claimObject]}</td>
                        <td className="px-4 py-2.5 max-w-[200px] truncate">
                          {c.claimTitle || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge
                            status={c.result?.claimStatus || c.claimStatus || "pending"}
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          {c.result?.severity ? (
                            <SeverityBadge severity={c.result.severity} />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(c.submittedAt), { addSuffix: true })}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/result/$claimId" params={{ claimId: c.claimId }}>
                              Open
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">System Health</CardTitle>
              <ServerCog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                "Vision review service",
                "Claim extraction service",
                "Evidence validator",
                "History service",
              ].map((h) => (
                <div key={h} className="flex items-center justify-between text-sm">
                  <span>{h}</span>
                  <span
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: "var(--success)" }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
