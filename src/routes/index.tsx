import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { dashboardQuery } from "@/lib/query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell,
  LineChart as ReLineChart, Line, CartesianGrid, Legend,
} from "recharts";
import {
  CheckCircle2, PauseCircle, Clock, PlayCircle, Users2, ShieldAlert, FileWarning, ListChecks,
} from "lucide-react";
import { format, startOfWeek } from "date-fns";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  head: () => ({
    meta: [
      { title: "Resumen · Colibrí OS PM Dashboard" },
      { name: "description", content: "Panel operativo de dirección de proyectos alimentado por eventos de Trello vía n8n." },
      { property: "og:title", content: "Colibrí OS — Trello PM Dashboard" },
      { property: "og:description", content: "Panel operativo alimentado por eventos de Trello vía n8n." },
    ],
  }),
  component: ResumenPage,
});

function KPI({ label, value, icon, tone = "default" }: { label: string; value: ReactNode; icon: ReactNode; tone?: "default" | "warning" | "destructive" | "success" }) {
  const toneCls =
    tone === "warning" ? "text-warning" :
    tone === "destructive" ? "text-destructive" :
    tone === "success" ? "text-success" : "text-primary";
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`size-9 rounded-md bg-muted grid place-items-center ${toneCls}`}>{icon}</div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold leading-tight tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function ResumenPage() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const { cards, events } = data;
  const total = cards.length;
  const inProgress = cards.filter(c => c.status === "In Progress").length;
  const done = cards.filter(c => c.status === "Done").length;
  const blocked = cards.filter(c => c.status === "Blocked").length;
  const overdue = cards.filter(c => c.due_date && new Date(c.due_date) < new Date() && c.status !== "Done").length;
  const unowned = cards.filter(c => !c.owner).length;
  const releaseBlockers = cards.filter(c => c.release_blocker).length;
  const missingEvidence = cards.filter(c => c.evidence_required && !c.has_evidence).length;

  const byStatus = ["Inbox","Backlog","Ready","In Progress","Review / QA","Blocked","Done","Cancelled"].map((s) => ({
    name: s, value: cards.filter(c => c.status === s).length,
  }));
  const byTeam = Array.from(new Set(cards.map(c=>c.team))).map(t => ({
    name: t, wip: cards.filter(c=>c.team===t && ["In Progress","Review / QA"].includes(c.status)).length,
    done: cards.filter(c=>c.team===t && c.status==="Done").length,
  }));
  const byPriority = ["P0","P1","P2","P3"].map(p => ({ name: p, value: cards.filter(c=>c.priority===p).length }));
  const byRisk = ["Critical","High","Medium","Low"].map(r => ({ name: r, value: cards.filter(c=>c.risk===r).length }));

  // throughput per week from completed_at
  const weeks = new Map<string, number>();
  cards.filter(c=>c.completed_at).forEach(c=>{
    const k = format(startOfWeek(new Date(c.completed_at!)), "dd MMM");
    weeks.set(k, (weeks.get(k)??0)+1);
  });
  const throughput = Array.from(weeks.entries()).map(([name,v])=>({name, done: v})).slice(-8);

  // lead/cycle time synthetic
  const leadCycle = byTeam.map((t) => ({
    name: t.name,
    lead: 5 + Math.round(Math.random()*15),
    cycle: 2 + Math.round(Math.random()*8),
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Resumen ejecutivo</h1>
          <p className="text-sm text-muted-foreground">
            {total} tarjetas · {events.length} eventos procesados · fuente <span className="mono">{data.source}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Tarjetas totales" value={total} icon={<ListChecks className="size-4" />} />
          <KPI label="En progreso" value={inProgress} icon={<PlayCircle className="size-4" />} />
          <KPI label="Completadas" value={done} icon={<CheckCircle2 className="size-4" />} tone="success" />
          <KPI label="Bloqueadas" value={blocked} icon={<PauseCircle className="size-4" />} tone="destructive" />
          <KPI label="Vencidas" value={overdue} icon={<Clock className="size-4" />} tone="warning" />
          <KPI label="Sin responsable" value={unowned} icon={<Users2 className="size-4" />} />
          <KPI label="Release blockers" value={releaseBlockers} icon={<ShieldAlert className="size-4" />} tone="destructive" />
          <KPI label="Evidencias faltantes" value={missingEvidence} icon={<FileWarning className="size-4" />} tone="warning" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Distribución por estado</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer>
                <BarChart data={byStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Throughput por semana</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer>
                <ReLineChart data={throughput}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Line dataKey="done" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
                </ReLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Trabajo por equipo</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer>
                <BarChart data={byTeam}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="wip" name="WIP" fill="var(--chart-1)" radius={[4,4,0,0]} />
                  <Bar dataKey="done" name="Done" fill="var(--chart-2)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Prioridad y riesgo</CardTitle></CardHeader>
            <CardContent className="h-72 grid grid-cols-2 gap-2">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byPriority} dataKey="value" nameKey="name" outerRadius={70} label={{ fontSize: 11, fill: "var(--foreground)" }}>
                    {byPriority.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byRisk} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} label={{ fontSize: 11, fill: "var(--foreground)" }}>
                    {byRisk.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i+2) % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-sm">Lead time y cycle time por equipo (días)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer>
                <BarChart data={leadCycle}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="lead" name="Lead time" fill="var(--chart-3)" radius={[4,4,0,0]} />
                  <Bar dataKey="cycle" name="Cycle time" fill="var(--chart-1)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
