import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_app/evaluation")({
  head: () => ({ meta: [{ title: "Evaluation · EvidenceLens AI" }] }),
  component: EvalPage,
});

const METRICS = [
  ["Sample claims evaluated", "120"],
  ["Claim-status accuracy", "88%"],
  ["Evidence-standard accuracy", "91%"],
  ["Issue-type accuracy", "86%"],
  ["Object-part accuracy", "84%"],
  ["Severity accuracy", "79%"],
  ["Exact-schema validity", "98%"],
  ["Average latency", "8.4 s"],
  ["Estimated model calls", "240"],
];

const ACC = [
  { metric: "Claim status", A: 78, B: 88 },
  { metric: "Evidence std.", A: 81, B: 91 },
  { metric: "Issue type", A: 76, B: 86 },
  { metric: "Object part", A: 74, B: 84 },
  { metric: "Severity", A: 70, B: 79 },
];

const LAT = [
  { strategy: "Strategy A", latency: 5.8 },
  { strategy: "Strategy B", latency: 8.4 },
];

const ERRORS = [
  {
    claimId: "CLM-90112",
    expected: "supported",
    predicted: "not_enough_information",
    type: "Under-confidence",
    notes: "Image was usable but partially cropped.",
  },
  {
    claimId: "CLM-90108",
    expected: "contradicted",
    predicted: "supported",
    type: "Missed mismatch",
    notes: "Visible damage was on adjacent part.",
  },
  {
    claimId: "CLM-90104",
    expected: "not_enough_information",
    predicted: "contradicted",
    type: "Over-confidence",
    notes: "Decided despite missing angle.",
  },
];

function EvalPage() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
        {METRICS.map(([l, v]) => (
          <Card key={l}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{l}</div>
              <div className="mt-1 text-xl font-semibold">{v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Strategy comparison</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 text-left">Metric</th>
                <th className="px-3 py-2.5 text-left">Strategy A — Single multimodal prompt</th>
                <th className="px-3 py-2.5 text-left">Strategy B — Two-stage pipeline</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Claim status accuracy", "78%", "88%"],
                ["Evidence-standard accuracy", "81%", "91%"],
                ["Issue-type accuracy", "76%", "86%"],
                ["Average latency", "5.8 s", "8.4 s"],
                ["Estimated calls per claim", "1", "2"],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium">{row[0]}</td>
                  <td className="px-3 py-2.5">{row[1]}</td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: "var(--success)" }}>
                    {row[2]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between gap-3 border-t border-border p-3 text-sm">
            <div>
              <Badge className="mr-2" style={{ backgroundColor: "var(--success)" }}>
                Selected
              </Badge>
              Strategy B — two-stage pipeline (extract claim → review evidence).
            </div>
            <span className="text-xs text-muted-foreground">
              Separating extraction from review improves consistency and structured-output quality.
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accuracy comparison</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ACC}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="metric" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="A" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="B" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latency comparison</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={LAT}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="strategy" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} unit="s" />
                <Tooltip />
                <Bar dataKey="latency" fill="var(--ai)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Error analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 text-left">Claim ID</th>
                <th className="px-3 py-2.5 text-left">Expected</th>
                <th className="px-3 py-2.5 text-left">Predicted</th>
                <th className="px-3 py-2.5 text-left">Error type</th>
                <th className="px-3 py-2.5 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {ERRORS.map((e) => (
                <tr key={e.claimId} className="border-t border-border">
                  <td className="px-3 py-2.5 font-mono text-xs">{e.claimId}</td>
                  <td className="px-3 py-2.5">{e.expected}</td>
                  <td className="px-3 py-2.5" style={{ color: "var(--destructive)" }}>
                    {e.predicted}
                  </td>
                  <td className="px-3 py-2.5">{e.type}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{e.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          ["Model calls", "240 / batch"],
          ["Images processed", "186"],
          ["Approx. token usage", "~412k"],
          ["Estimated cost", "$3.91"],
          ["Average runtime", "8.4 s"],
          ["Retry strategy", "Exponential backoff, 3 tries"],
          ["Caching strategy", "Per-image hash, 24h TTL"],
          ["Rate-limit handling", "Token-bucket per provider"],
        ].map(([l, v]) => (
          <Card key={l}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{l}</div>
              <div className="mt-1 text-sm font-semibold">{v}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
