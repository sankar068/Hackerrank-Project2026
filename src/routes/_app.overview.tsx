import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadClaims } from "@/lib/storage";
import type { StoredClaim } from "@/types/claim";
import { StatusBadge, SeverityBadge, RiskChip } from "@/components/status-badge";
import { OBJECT_LABEL } from "@/lib/labels";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, ArrowRight, AlertTriangle, ImageOff, ShieldX, Crosshair, ServerCog, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/overview")({
  head: () => ({ meta: [{ title: "Overview · EvidenceLens AI" }] }),
  component: Overview,
});

const METRICS = [
  { label: "Total Claims", value: 148, change: "+12.4%", up: true },
  { label: "Supported", value: 82, change: "+8.1%", up: true, color: "var(--success)" },
  { label: "Contradicted", value: 29, change: "-3.2%", up: false, color: "var(--destructive)" },
  { label: "Insufficient Evidence", value: 37, change: "+2.0%", up: true, color: "var(--warning)" },
  { label: "Manual Review Required", value: 21, change: "+4.5%", up: true, color: "var(--ai)" },
  { label: "Avg. Review Time", value: "8.4s", change: "-0.6s", up: false },
];

const PIE = [
  { name: "Supported", value: 55, color: "var(--success)" },
  { name: "Contradicted", value: 20, color: "var(--destructive)" },
  { name: "Not Enough Info", value: 25, color: "var(--warning)" },
];

const BARS = [
  { name: "Car", value: 62 },
  { name: "Laptop", value: 48 },
  { name: "Package", value: 38 },
];

const WEEK = [
  { d: "Mon", v: 18 }, { d: "Tue", v: 24 }, { d: "Wed", v: 31 }, { d: "Thu", v: 27 },
  { d: "Fri", v: 35 }, { d: "Sat", v: 14 }, { d: "Sun", v: 9 },
];

const ATTENTION = [
  { icon: ImageOff, label: "Blurry image cases", count: 7, tone: "var(--warning)" },
  { icon: AlertTriangle, label: "User-history risk cases", count: 5, tone: "var(--ai)" },
  { icon: ShieldX, label: "Possible manipulation", count: 4, tone: "var(--destructive)" },
  { icon: Crosshair, label: "Wrong object-part cases", count: 5, tone: "var(--info)" },
];

const HEALTH = [
  "Vision review service", "Claim extraction service", "Evidence validator", "History service", "Demo engine",
];

function Overview() {
  const [claims, setClaims] = useState<StoredClaim[]>([]);
  useEffect(() => {
    setClaims(loadClaims());
    const h = () => setClaims(loadClaims());
    window.addEventListener("evidencelens:claims", h);
    return () => window.removeEventListener("evidencelens:claims", h);
  }, []);

  const recent = useMemo(() => claims.slice(0, 6), [claims]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {METRICS.map((m) => (
          <Card key={m.label} className="shadow-soft">
            <CardContent className="p-5">
              <div className="text-xs font-medium text-muted-foreground">{m.label}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <div className="text-2xl font-semibold" style={m.color ? { color: m.color } : undefined}>{m.value}</div>
                <span className={`flex items-center text-[11px] font-medium ${m.up ? "text-success" : "text-destructive"}`} style={{ color: m.up ? "var(--success)" : "var(--destructive)" }}>
                  {m.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {m.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Claim Decision Distribution</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={PIE} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {PIE.map((p) => <Cell key={p.name} fill={p.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              {PIE.map((p) => (
                <span key={p.name} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />{p.name} · {p.value}%</span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Claims by Object Type</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BARS}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Claims Reviewed This Week</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={WEEK}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="v" stroke="var(--ai)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Claims</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/claims">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
          </CardHeader>
          <CardContent className="p-0">
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
                      <td className="px-4 py-2.5">{c.userName}</td>
                      <td className="px-4 py-2.5">{OBJECT_LABEL[c.claimObject]}</td>
                      <td className="px-4 py-2.5 max-w-[200px] truncate">{c.claimTitle}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={c.result.claimStatus} /></td>
                      <td className="px-4 py-2.5"><SeverityBadge severity={c.result.severity} /></td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.submittedAt), { addSuffix: true })}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button asChild size="sm" variant="ghost"><Link to="/claims" search={{ q: c.claimId } as never}>Open</Link></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader><CardTitle className="text-base">Review Attention</CardTitle></CardHeader>
            <CardContent className="space-y-2.5">
              {ATTENTION.map((a) => (
                <div key={a.label} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ backgroundColor: `color-mix(in oklab, ${a.tone} 14%, transparent)`, color: a.tone }}>
                    <a.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-sm">{a.label}</div>
                  <div className="text-sm font-semibold">{a.count}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">System Health</CardTitle>
              <ServerCog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              {HEALTH.map((h) => (
                <div key={h} className="flex items-center justify-between text-sm">
                  <span>{h}</span>
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--success)" }}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <RiskChipLegend />
        </div>
      </div>
    </div>
  );
}

function RiskChipLegend() {
  return (
    <Card className="shadow-soft">
      <CardHeader><CardTitle className="text-base">Active Risk Surface</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-1.5">
        {["blurry_image", "wrong_object_part", "possible_manipulation", "user_history_risk", "text_instruction_present", "manual_review_required"].map((r) => (
          <RiskChip key={r} risk={r as never} />
        ))}
      </CardContent>
    </Card>
  );
}
