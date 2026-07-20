import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { dashboardQuery } from "@/lib/query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/format";
import { ExternalLink, FileX2 } from "lucide-react";

export const Route = createFileRoute("/evidencias")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  head: () => ({ meta: [{ title: "Evidencias · Colibrí OS" }, { name: "description", content: "Trazabilidad de commits, PRs, CI, releases y auditorías." }] }),
  component: EvidenciasPage,
});

const typeColor: Record<string,string> = {
  commit: "bg-primary/15 text-primary border-primary/30",
  pull_request: "bg-info/15 text-info border-info/30",
  ci: "bg-chart-5/20 text-chart-5 border-chart-5/40",
  deployment: "bg-success/20 text-success border-success/40",
  release: "bg-warning/20 text-warning border-warning/40",
  security: "bg-destructive/20 text-destructive border-destructive/40",
  document: "bg-muted text-muted-foreground border-border",
  test: "bg-info/20 text-info border-info/40",
};

function EvidenciasPage() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const { evidences, cards } = data;
  const missing = cards.filter(c => c.status==="Done" && c.evidence_required && !c.has_evidence);

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Evidencias</h1>

        {missing.length>0 && (
          <Card className="border-warning/40 bg-warning/10">
            <CardContent className="p-4 flex items-start gap-3">
              <FileX2 className="size-5 text-warning shrink-0" />
              <div>
                <div className="text-sm font-medium">{missing.length} tarjetas Done sin evidencia requerida</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {missing.slice(0,10).map(c=>(
                    <span key={c.id} className="mono text-[11px] px-2 py-0.5 rounded border border-border bg-background">{c.work_item_id}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-sm">Registro de evidencias ({evidences.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">Tarjeta</th>
                    <th className="px-3 py-2 font-medium">Hash</th>
                    <th className="px-3 py-2 font-medium">Actor</th>
                    <th className="px-3 py-2 font-medium">Entorno</th>
                    <th className="px-3 py-2 font-medium">Resultado</th>
                    <th className="px-3 py-2 font-medium">Fecha</th>
                    <th className="px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {evidences.map(ev=>(
                    <tr key={ev.id} className="border-t border-border/60">
                      <td className="px-3 py-2"><Badge variant="outline" className={`text-[10px] ${typeColor[ev.type]}`}>{ev.type}</Badge></td>
                      <td className="px-3 py-2 mono text-xs">{ev.work_item_id}</td>
                      <td className="px-3 py-2 mono text-xs text-muted-foreground">{ev.hash}</td>
                      <td className="px-3 py-2">{ev.actor}</td>
                      <td className="px-3 py-2 text-xs">{ev.environment}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs mono ${ev.result==="success"?"text-success":ev.result==="failure"?"text-destructive":"text-warning"}`}>
                          {ev.result}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(ev.date)}</td>
                      <td className="px-3 py-2">
                        <a href={ev.url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                          abrir <ExternalLink className="size-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
