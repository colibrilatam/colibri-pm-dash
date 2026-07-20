import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { dashboardQuery } from "@/lib/query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HealthBadge } from "@/components/badges";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/equipos")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  head: () => ({ meta: [{ title: "Equipos · Colibrí OS" }, { name: "description", content: "Salud, WIP y carga por equipo." }] }),
  component: EquiposPage,
});

function EquiposPage() {
  const { data } = useSuspenseQuery(dashboardQuery);
  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Equipos</h1>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.teams.map((t) => {
            const overWip = t.wip > t.wip_limit;
            return (
              <Card key={t.team}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{t.team}</CardTitle>
                    <HealthBadge value={t.health} />
                  </div>
                  <div className="text-xs text-muted-foreground">Owner principal · {t.owner}</div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <Stat label="WIP" value={t.wip} />
                    <Stat label="Done" value={t.completed} />
                    <Stat label="Bloqueadas" value={t.blocked} tone={t.blocked>0?"destructive":"default"} />
                    <Stat label="Vencidas" value={t.overdue} tone={t.overdue>0?"warning":"default"} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Uso WIP</span>
                      <span className="mono">{t.wip}/{t.wip_limit}</span>
                    </div>
                    <Progress value={Math.min(100, (t.wip/t.wip_limit)*100)} />
                    {overWip && (
                      <div className="mt-2 text-xs flex items-center gap-1 text-warning">
                        <AlertTriangle className="size-3.5" /> WIP superado
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Carga por miembro</div>
                    <div className="space-y-1">
                      {t.members.map(m => (
                        <div key={m.name} className="flex items-center justify-between text-xs">
                          <span className="truncate">{m.name}</span>
                          <span className="mono text-muted-foreground">WIP {m.wip} · Done {m.completed}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Story points totales · <span className="mono text-foreground">{t.story_points}</span></div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value, tone="default" }: { label: string; value: number; tone?: "default"|"warning"|"destructive" }) {
  const c = tone==="warning" ? "text-warning" : tone==="destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-muted/30 py-2">
      <div className={`text-lg font-semibold tabular-nums ${c}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
