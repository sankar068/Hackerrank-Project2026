import { useRouterState } from "@tanstack/react-router";
import { Bell, Search, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "./app-sidebar";

export function TopNav({ onMenu }: { onMenu: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = NAV_ITEMS.find((n) => pathname.startsWith(n.to))?.label ?? "Dashboard";
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>
      <h1 className="truncate text-lg font-semibold">{current}</h1>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search claims, users, rules…" className="h-9 w-56 pl-8 lg:w-72" />
        </div>
        <span className="hidden rounded-md border border-ai/30 bg-ai/10 px-2 py-1 text-[11px] font-medium text-ai sm:inline" style={{ color: "var(--ai)" }}>Demo Mode</span>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">RA</div>
      </div>
    </header>
  );
}
