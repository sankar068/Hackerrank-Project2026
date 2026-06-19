import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { StoredClaim, ClaimObject, ClaimStatus, Severity, RiskFlag } from "@/types/claim";
import { loadClaims, removeClaim, appendAudit } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, SeverityBadge, RiskChip } from "@/components/status-badge";
import { OBJECT_LABEL, STATUS_LABEL, RISK_LABEL } from "@/lib/labels";
import { formatDistanceToNow } from "date-fns";
import { Download, Eye, Trash2, AlertTriangle, Search } from "lucide-react";
import { exportResultCsv } from "@/utils/csvExport";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/claims")({
  head: () => ({ meta: [{ title: "Claims · EvidenceLens AI" }] }),
  component: ClaimsPage,
});

const PAGE_SIZE = 10;

function ClaimsPage() {
  const [claims, setClaims] = useState<StoredClaim[]>([]);
  const [q, setQ] = useState("");
  const [obj, setObj] = useState<"all" | ClaimObject>("all");
  const [status, setStatus] = useState<"all" | ClaimStatus>("all");
  const [severity, setSeverity] = useState<"all" | Severity>("all");
  const [risk, setRisk] = useState<"all" | RiskFlag>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setClaims(loadClaims());
    const h = () => setClaims(loadClaims());
    window.addEventListener("evidencelens:claims", h);
    return () => window.removeEventListener("evidencelens:claims", h);
  }, []);

  const filtered = useMemo(() => {
    return claims.filter((c) => {
      if (obj !== "all" && c.claimObject !== obj) return false;
      if (status !== "all" && c.result.claimStatus !== status) return false;
      if (severity !== "all" && c.result.severity !== severity) return false;
      if (risk !== "all" && !c.result.riskFlags.includes(risk)) return false;
      if (q) {
        const hay = `${c.claimId} ${c.userId} ${c.userName} ${c.claimTitle}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [claims, q, obj, status, severity, risk]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onDelete = (id: string) => {
    if (!confirm(`Delete demo claim ${id}?`)) return;
    removeClaim(id);
    appendAudit({
      claimId: id,
      actor: "review.admin",
      action: "Claim deleted (demo)",
      previousValue: "stored",
      newValue: "removed",
      reason: "User action",
      status: "warning",
    });
    toast.success("Claim removed");
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-6">
          <div className="relative md:col-span-2">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search claim ID, user, description"
              className="pl-8"
            />
          </div>
          <FilterSelect
            value={obj}
            onChange={(v) => {
              setObj(v as never);
              setPage(1);
            }}
            placeholder="Object"
            options={[
              ["all", "All objects"],
              ["car", "Car"],
              ["laptop", "Laptop"],
              ["package", "Package"],
            ]}
          />
          <FilterSelect
            value={status}
            onChange={(v) => {
              setStatus(v as never);
              setPage(1);
            }}
            placeholder="Decision"
            options={[["all", "All decisions"], ...Object.entries(STATUS_LABEL)]}
          />
          <FilterSelect
            value={severity}
            onChange={(v) => {
              setSeverity(v as never);
              setPage(1);
            }}
            placeholder="Severity"
            options={[
              ["all", "All severities"],
              ["none", "None"],
              ["low", "Low"],
              ["medium", "Medium"],
              ["high", "High"],
              ["unknown", "Unknown"],
            ]}
          />
          <FilterSelect
            value={risk}
            onChange={(v) => {
              setRisk(v as never);
              setPage(1);
            }}
            placeholder="Risk flag"
            options={[
              ["all", "All risks"],
              ...Object.entries(RISK_LABEL).filter(([k]) => k !== "none"),
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Claims ({filtered.length})</CardTitle>
          <span className="text-xs text-muted-foreground">
            Page {page} of {pages}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left">Claim ID</th>
                  <th className="px-3 py-2.5 text-left">User</th>
                  <th className="px-3 py-2.5 text-left">Object</th>
                  <th className="px-3 py-2.5 text-left">Summary</th>
                  <th className="px-3 py-2.5 text-center">Imgs</th>
                  <th className="px-3 py-2.5 text-left">Evidence</th>
                  <th className="px-3 py-2.5 text-left">Decision</th>
                  <th className="px-3 py-2.5 text-left">Severity</th>
                  <th className="px-3 py-2.5 text-left">Risks</th>
                  <th className="px-3 py-2.5 text-left">Reviewed</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {slice.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-3 py-12 text-center text-sm text-muted-foreground"
                    >
                      No claims match these filters.
                    </td>
                  </tr>
                )}
                {slice.map((c) => (
                  <tr
                    key={c.claimId}
                    className="border-t border-border align-top hover:bg-muted/30"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs">{c.claimId}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{c.userName}</div>
                      <div className="text-[11px] text-muted-foreground">{c.userId}</div>
                    </td>
                    <td className="px-3 py-2.5">{OBJECT_LABEL[c.claimObject]}</td>
                    <td className="px-3 py-2.5 max-w-[220px] truncate">{c.claimTitle}</td>
                    <td className="px-3 py-2.5 text-center">{c.images.length}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={c.result.evidenceStandardMet ? "default" : "secondary"}>
                        {c.result.evidenceStandardMet ? "Met" : "Not met"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={c.result.claimStatus} />
                    </td>
                    <td className="px-3 py-2.5">
                      <SeverityBadge severity={c.result.severity} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex max-w-[180px] flex-wrap gap-1">
                        {c.result.riskFlags.slice(0, 2).map((r) => (
                          <RiskChip key={r} risk={r} />
                        ))}
                        {c.result.riskFlags.length > 2 && (
                          <span className="text-[11px] text-muted-foreground">
                            +{c.result.riskFlags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.result.reviewedAt), { addSuffix: true })}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="icon" variant="ghost" aria-label="View">
                          <Link to="/result/$claimId" params={{ claimId: c.claimId }}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Export"
                          onClick={() => {
                            exportResultCsv(c, c.result);
                            toast.success("output.csv downloaded");
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Manual review"
                          onClick={() => {
                            appendAudit({
                              claimId: c.claimId,
                              actor: "review.admin",
                              action: "Manual review requested",
                              previousValue: c.result.claimStatus,
                              newValue: "manual_review",
                              reason: "Reviewer flagged",
                              status: "warning",
                            });
                            toast.success("Flagged for manual review");
                          }}
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete"
                          onClick={() => onDelete(c.claimId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-border p-3">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page === pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
