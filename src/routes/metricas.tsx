import { createFileRoute } from "@tanstack/react-router";
import { dashboardQuery } from "@/lib/query";
import { useDashboard } from "@/lib/board-filter";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { chartTooltipProps } from "@/lib/chart-theme";
import { computeActorActivity, computeFlowMetrics } from "@/lib/metrics";

export const Route = createFileRoute("/metricas")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  head: () => ({
    meta: [
      { title: "Métricas · Colibrí OS" },
      { name: "description", content: "Throughput, lead time, cycle time, WIP y tendencias." },
    ],
  }),
  component: MetricasPage,
});

function MetricasPage() {
  const data = useDashboard();
  const teams = data.teams;

  const perTeam = teams.map((t) => ({
    name: t.team,
    WIP: t.wip,
    Done: t.completed,
    Bloqueadas: t.blocked,
  }));
  const sprints = Array.from(
    new Set(data.cards.map((card) => card.sprint).filter((sprint) => sprint && sprint !== "—")),
  );
  const sprint = sprints.map((s) => {
    const list = data.cards.filter((c) => c.sprint === s);
    return {
      name: s,
      done: list.filter((c) => c.status === "Done").length,
      inProgress: list.filter((c) => c.status === "In Progress").length,
      blocked: list.filter((c) => c.status === "Blocked").length,
    };
  });
  const activity = computeActorActivity(data.events);
  const flow = computeFlowMetrics(data.cards, data.events);
  const leadCycle = flow;
  const reopens = flow.map(({ name, reopenings }) => ({ name, reaperturas: reopenings }));
  const dod = flow.map(({ name, evidenceCompliance }) => ({
    name,
    cumplimiento: evidenceCompliance,
  }));

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Métricas</h1>
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard title="WIP · Done · Bloqueadas por tablero Trello">
            <BarChart data={perTeam}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                angle={-20}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip {...chartTooltipProps} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="WIP" fill="var(--chart-1)" />
              <Bar dataKey="Done" fill="var(--chart-2)" />
              <Bar dataKey="Bloqueadas" fill="var(--chart-4)" />
            </BarChart>
          </ChartCard>

          <ChartCard title="Tendencia por sprint">
            <LineChart data={sprint}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip {...chartTooltipProps} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line dataKey="done" stroke="var(--chart-2)" strokeWidth={2} />
              <Line dataKey="inProgress" stroke="var(--chart-1)" strokeWidth={2} />
              <Line dataKey="blocked" stroke="var(--chart-4)" strokeWidth={2} />
            </LineChart>
          </ChartCard>

          <ChartCard title="Lead time / cycle time observados (días)">
            <BarChart data={leadCycle}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                angle={-20}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip {...chartTooltipProps} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="lead" fill="var(--chart-3)" />
              <Bar dataKey="cycle" fill="var(--chart-1)" />
            </BarChart>
          </ChartCard>

          <ChartCard title="Actividad por colaborador (eventos)">
            <BarChart data={activity}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                angle={-20}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip {...chartTooltipProps} />
              <Bar dataKey="actividad" fill="var(--chart-5)" />
            </BarChart>
          </ChartCard>

          <ChartCard title="Reaperturas por equipo">
            <BarChart data={reopens}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                angle={-20}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip {...chartTooltipProps} />
              <Bar dataKey="reaperturas" fill="var(--chart-4)" />
            </BarChart>
          </ChartCard>

          <ChartCard title="Evidencia requerida disponible (%)">
            <BarChart data={dod}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                angle={-20}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} domain={[0, 100]} />
              <Tooltip {...chartTooltipProps} />
              <Bar dataKey="cumplimiento" fill="var(--chart-2)" />
            </BarChart>
          </ChartCard>
        </div>
      </div>
    </AppLayout>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
