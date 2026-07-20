import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { dashboardQuery } from "@/lib/query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";

export const Route = createFileRoute("/metricas")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  head: () => ({ meta: [{ title: "Métricas · Colibrí OS" }, { name: "description", content: "Throughput, lead time, cycle time, WIP y tendencias." }] }),
  component: MetricasPage,
});

function MetricasPage() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const teams = data.teams;

  const perTeam = teams.map(t=>({ name: t.team, WIP: t.wip, Done: t.completed, Bloqueadas: t.blocked }));
  const sprint = ["S-25","S-26","S-27","S-28"].map(s=>{
    const list = data.cards.filter(c=>c.sprint===s);
    return {
      name: s,
      done: list.filter(c=>c.status==="Done").length,
      inProgress: list.filter(c=>c.status==="In Progress").length,
      blocked: list.filter(c=>c.status==="Blocked").length,
    };
  });
  const activity = teams.map(t=>({ name: t.team, actividad: t.members.reduce((s,m)=>s+m.wip+m.completed,0) }));
  const leadCycle = teams.map(t=>({ name: t.team, lead: 6 + Math.round(Math.random()*12), cycle: 2 + Math.round(Math.random()*6) }));
  const reopens = teams.map(t=>({ name: t.team, reaperturas: Math.round(Math.random()*4) }));
  const dod = teams.map(t=>({ name: t.team, cumplimiento: 60 + Math.round(Math.random()*40) }));

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Métricas</h1>
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard title="WIP · Done · Bloqueadas por equipo">
            <BarChart data={perTeam}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill:"var(--muted-foreground)", fontSize:11 }} angle={-20} textAnchor="end" height={60} interval={0} />
              <YAxis tick={{ fill:"var(--muted-foreground)", fontSize:11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize:12 }} />
              <Bar dataKey="WIP" fill="var(--chart-1)" />
              <Bar dataKey="Done" fill="var(--chart-2)" />
              <Bar dataKey="Bloqueadas" fill="var(--chart-4)" />
            </BarChart>
          </ChartCard>

          <ChartCard title="Tendencia por sprint">
            <LineChart data={sprint}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill:"var(--muted-foreground)", fontSize:11 }} />
              <YAxis tick={{ fill:"var(--muted-foreground)", fontSize:11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize:12 }} />
              <Line dataKey="done" stroke="var(--chart-2)" strokeWidth={2} />
              <Line dataKey="inProgress" stroke="var(--chart-1)" strokeWidth={2} />
              <Line dataKey="blocked" stroke="var(--chart-4)" strokeWidth={2} />
            </LineChart>
          </ChartCard>

          <ChartCard title="Lead time / cycle time (días)">
            <BarChart data={leadCycle}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill:"var(--muted-foreground)", fontSize:11 }} angle={-20} textAnchor="end" height={60} interval={0} />
              <YAxis tick={{ fill:"var(--muted-foreground)", fontSize:11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize:12 }} />
              <Bar dataKey="lead" fill="var(--chart-3)" />
              <Bar dataKey="cycle" fill="var(--chart-1)" />
            </BarChart>
          </ChartCard>

          <ChartCard title="Actividad por miembro (agregada)">
            <BarChart data={activity}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill:"var(--muted-foreground)", fontSize:11 }} angle={-20} textAnchor="end" height={60} interval={0} />
              <YAxis tick={{ fill:"var(--muted-foreground)", fontSize:11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="actividad" fill="var(--chart-5)" />
            </BarChart>
          </ChartCard>

          <ChartCard title="Reaperturas por equipo">
            <BarChart data={reopens}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill:"var(--muted-foreground)", fontSize:11 }} angle={-20} textAnchor="end" height={60} interval={0} />
              <YAxis tick={{ fill:"var(--muted-foreground)", fontSize:11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="reaperturas" fill="var(--chart-4)" />
            </BarChart>
          </ChartCard>

          <ChartCard title="Cumplimiento Definition of Done (%)">
            <BarChart data={dod}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill:"var(--muted-foreground)", fontSize:11 }} angle={-20} textAnchor="end" height={60} interval={0} />
              <YAxis tick={{ fill:"var(--muted-foreground)", fontSize:11 }} domain={[0,100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="cumplimiento" fill="var(--chart-2)" />
            </BarChart>
          </ChartCard>
        </div>
      </div>
    </AppLayout>
  );
}

const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 } as const;

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
