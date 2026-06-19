import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FilePlus2,
  ClipboardList,
  ShieldAlert,
  BookOpenCheck,
  Users,
  GaugeCircle,
  ScrollText,
  Settings,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/new-claim", label: "New Claim Review", icon: FilePlus2 },
  { to: "/claims", label: "Claims", icon: ClipboardList },
  { to: "/queue", label: "Review Queue", icon: ShieldAlert },
  { to: "/rules", label: "Evidence Rules", icon: BookOpenCheck },
  { to: "/users", label: "Users & History", icon: Users },
  { to: "/evaluation", label: "Evaluation", icon: GaugeCircle },
  { to: "/audit", label: "Audit Logs", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
          <Eye className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">EvidenceLens AI</div>
          <div className="truncate text-[11px] text-sidebar-foreground/60">Claim Review Console</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-4 py-4 space-y-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="rounded-md bg-ai/15 px-2 py-1 font-medium text-ai-foreground" style={{ backgroundColor: "color-mix(in oklab, var(--ai) 18%, transparent)", color: "white" }}>Demo Mode</span>
          <span className="flex items-center gap-1.5 text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Operational
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-sidebar-accent text-xs font-semibold">RA</div>
          <div className="min-w-0 text-xs">
            <div className="truncate font-medium">Review Administrator</div>
            <div className="truncate text-sidebar-foreground/60">admin@evidencelens.ai</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export const NAV_ITEMS = NAV;
