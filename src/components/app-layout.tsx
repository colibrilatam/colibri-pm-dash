import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  LayoutDashboard, Users, Kanban, Activity, AlertTriangle,
  FileCheck2, LineChart, Settings, Search, Zap, WifiOff, Wifi, Menu, X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dashboardQuery } from "@/lib/query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: NavItem[] = [
  { to: "/", label: "Resumen", icon: LayoutDashboard, exact: true },
  { to: "/equipos", label: "Equipos", icon: Users },
  { to: "/tablero", label: "Tablero", icon: Kanban },
  { to: "/actividad", label: "Actividad", icon: Activity },
  { to: "/riesgos", label: "Riesgos", icon: AlertTriangle },
  { to: "/evidencias", label: "Evidencias", icon: FileCheck2 },
  { to: "/metricas", label: "Métricas", icon: LineChart },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data } = useQuery(dashboardQuery);
  const [open, setOpen] = useState(false);

  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to : path === to || path.startsWith(to + "/");

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed z-40 md:static md:translate-x-0 transition-transform",
          "w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border min-h-screen flex flex-col",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="h-14 flex items-center gap-2 px-4 border-b border-sidebar-border">
          <div className="size-8 rounded-md bg-primary/20 text-primary grid place-items-center">
            <Zap className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-none">Colibrí OS</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Trello PM Dashboard</div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = isActive(n.to, n.exact);
            return (
              <Link
                key={n.to}
                to={n.to as "/"}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4" />
                <span>{n.label}</span>
                {active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border text-[11px] text-muted-foreground">
          <div className="mono">schema v2.0.0</div>
          <div>n8n · Trello · TanStack</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
          <div className="h-full px-4 flex items-center gap-3">
            <button className="md:hidden p-2 rounded hover:bg-accent" onClick={() => setOpen((v) => !v)}>
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold truncate">{data?.cards[0] ? "Colibrí OS" : "Colibrí OS"}</span>
              <Badge variant="outline" className="hidden sm:inline-flex text-[10px] mono">
                board · {data ? data.cards.length : "—"} cards
              </Badge>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar tarjeta, actor, campo…" className="pl-8 h-9 w-64" />
              </div>
              <Select defaultValue="30d">
                <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7d</SelectItem>
                  <SelectItem value="14d">Últimos 14d</SelectItem>
                  <SelectItem value="30d">Últimos 30d</SelectItem>
                  <SelectItem value="90d">Últimos 90d</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los sprints</SelectItem>
                  <SelectItem value="S-25">Sprint 25</SelectItem>
                  <SelectItem value="S-26">Sprint 26</SelectItem>
                  <SelectItem value="S-27">Sprint 27</SelectItem>
                  <SelectItem value="S-28">Sprint 28</SelectItem>
                </SelectContent>
              </Select>
              <ConnStatus source={data?.source} />
            </div>
          </div>
          {data?.source === "demo" && (
            <div className="bg-warning/15 text-warning border-t border-warning/30 text-xs px-4 py-1.5 flex items-start gap-2">
              <WifiOff className="size-3.5 mt-0.5 shrink-0" />
              <span>
                <b>Modo demostración</b> —{" "}
                {data.error ?? (
                  <>
                    no hay endpoint de lectura configurado. Define <code className="mono">VITE_TRELLO_EVENTS_API_URL</code> con una API que devuelva <code className="mono">{`{cards, events, evidences}`}</code>.
                  </>
                )}
              </span>
            </div>
          )}
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-full">{children}</main>
      </div>
    </div>
  );
}

function ConnStatus({ source }: { source?: "live" | "demo" }) {
  const live = source === "live";
  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs border",
      live ? "border-success/40 bg-success/10 text-success" : "border-warning/40 bg-warning/10 text-warning"
    )}>
      {live ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      <span className="mono">{live ? "LIVE" : "DEMO"}</span>
    </div>
  );
}
