import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Activity,
  AlertTriangle,
  FileCheck2,
  LineChart,
  Settings,
  Search,
  Zap,
  WifiOff,
  Wifi,
  Menu,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dashboardQuery } from "@/lib/query";
import {
  filterByBoard,
  resolveBoard,
  hydrateSelectedBoard,
  listBoards,
  setSelectedBoard,
  useSelectedBoard,
} from "@/lib/board-filter";
import {
  filterByDashboardControls,
  setDashboardFilters,
  useDashboardFilters,
} from "@/lib/dashboard-filters";
import type { DashboardSource } from "@/lib/data-adapter";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const { data, dataUpdatedAt } = useQuery(dashboardQuery);
  const [open, setOpen] = useState(false);
  const board = resolveBoard(data, useSelectedBoard());
  const filters = useDashboardFilters();
  useEffect(() => {
    hydrateSelectedBoard();
  }, []);
  const boards = data ? listBoards(data) : [];
  const visibleData = data
    ? filterByDashboardControls(filterByBoard(data, board), filters)
    : undefined;
  const visibleCards = visibleData?.cards.length ?? 0;
  const sprints = data
    ? Array.from(
        new Set(data.cards.map((card) => card.sprint).filter((sprint) => sprint && sprint !== "—")),
      ).sort()
    : [];

  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to : path === to || path.startsWith(to + "/");

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed z-40 md:static md:translate-x-0 transition-transform",
          "w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border min-h-screen flex flex-col",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
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
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
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
            <button
              aria-label={open ? "Cerrar navegación" : "Abrir navegación"}
              aria-expanded={open}
              className="md:hidden p-2 rounded hover:bg-accent"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <Kanban className="size-4 text-primary shrink-0" />
              <Select value={boards.length ? board : undefined} onValueChange={setSelectedBoard}>
                <SelectTrigger className="h-9 w-[220px] font-semibold border-primary/40">
                  <SelectValue placeholder="Elige tablero" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="hidden sm:inline-flex text-[10px] mono">
                {visibleCards} tarjetas
              </Badge>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Buscar en el dashboard"
                  placeholder="Buscar tarjeta, actor, campo…"
                  value={filters.query}
                  onChange={(event) => setDashboardFilters({ query: event.target.value })}
                  className="pl-8 h-9 w-64"
                />
              </div>
              <Select
                value={filters.range}
                onValueChange={(range) =>
                  setDashboardFilters({ range: range as typeof filters.range })
                }
              >
                <SelectTrigger className="h-9 w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7d</SelectItem>
                  <SelectItem value="14d">Últimos 14d</SelectItem>
                  <SelectItem value="30d">Últimos 30d</SelectItem>
                  <SelectItem value="90d">Últimos 90d</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.sprint}
                onValueChange={(sprint) => setDashboardFilters({ sprint })}
              >
                <SelectTrigger className="h-9 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los sprints</SelectItem>
                  {sprints.map((sprint) => (
                    <SelectItem key={sprint} value={sprint}>
                      {sprint}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ConnStatus source={data?.source} />
            </div>
          </div>
          {data && data.source !== "live" && (
            <div
              className={`border-t text-xs px-4 py-1.5 flex items-start gap-2 ${data.source === "unavailable" ? "bg-destructive/15 text-destructive border-destructive/30" : "bg-warning/15 text-warning border-warning/30"}`}
            >
              <WifiOff className="size-3.5 mt-0.5 shrink-0" />
              <span>
                <b>
                  {data.source === "demo"
                    ? "Modo demostración"
                    : data.source === "stale"
                      ? "Datos antiguos"
                      : "Datos no disponibles"}
                </b>{" "}
                — {data.error ?? <>no se puede confirmar la fuente operativa actual.</>}
              </span>
            </div>
          )}
        </header>
        <div className="px-4 md:px-6 pt-4 text-xs text-muted-foreground">
          Tablero activo: <b className="text-foreground">{boards.length ? board : "—"}</b> ·{" "}
          {visibleCards} tarjetas · se actualiza cada 10 min
          {filters.range !== "all" ? " · periodo aplicado a actividad y evidencias" : ""}
          {dataUpdatedAt
            ? ` · última carga ${new Date(dataUpdatedAt).toLocaleTimeString("es-ES")}`
            : ""}
          {data?.generatedAt
            ? ` · fuente ${new Date(data.generatedAt).toLocaleString("es-ES")}`
            : ""}
        </div>
        <main className="flex-1 min-w-0 w-full max-w-full p-4 md:p-6 pt-3">
          {data && visibleCards === 0 && boards.length > 0 && (
            <div className="mb-4 rounded-md border border-border p-4 text-sm text-muted-foreground">
              Sin tarjetas en {board}.
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

function ConnStatus({ source }: { source?: DashboardSource }) {
  const live = source === "live";
  const stale = source === "stale";
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs border",
        live
          ? "border-success/40 bg-success/10 text-success"
          : stale
            ? "border-warning/40 bg-warning/10 text-warning"
            : "border-destructive/40 bg-destructive/10 text-destructive",
      )}
    >
      {live ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      <span className="mono">
        {live ? "LIVE" : stale ? "STALE" : source === "demo" ? "DEMO" : "OFFLINE"}
      </span>
    </div>
  );
}
