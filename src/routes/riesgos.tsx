import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { dashboardQuery } from "@/lib/query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge, RiskBadge, StatusBadge } from "@/components/badges";
import { fmtDate } from "@/lib/format";
import type { Risk, Priority } from "@/lib/types";

export const Route = createFileRoute("/riesgos")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  head: () => ({ meta: [{ title: "Riesgos · Colibrí OS" }, { name: "description", content: "Riesgos activos, bloqueos y aging del backlog." }] }),
  component: RiesgosPage,
});

const RISK_ORDER: Risk[] = ["Critical","High","Medium","Low"];
const PRI_ORDER: Priority[] = ["P0","P1","P2","P3"];

function RiesgosPage() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const { cards } = data;
  const openHighPri = cards.filter(c=>["P0","P1"].includes(c.priority) && !["Done","Cancelled"].includes(c.status));
  const blocked = cards.filter(c=>c.status==="Blocked");
  const releaseBlockers = cards.filter(c=>c.release_blocker);
  const overdue = cards.filter(c=>c.due_date && new Date(c.due_date)<new Date() && c.status!=="Done");
  const aging = [...cards].filter(c=>!["Done","Cancelled"].includes(c.status))
    .sort((a,b)=> a.created_at.localeCompare(b.created_at)).slice(0,10);

  // matrix riesgo x prioridad
  const matrix = RISK_ORDER.map(r => ({
    risk: r,
    cells: PRI_ORDER.map(p => cards.filter(c=>c.risk===r && c.priority===p && c.status!=="Done" && c.status!=="Cancelled").length),
  }));

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Riesgos</h1>
        <div className="grid lg:grid-cols-2 gap-4">
          <RiskList title={`P0/P1 abiertos (${openHighPri.length})`} items={openHighPri} />
          <RiskList title={`Bloqueadas (${blocked.length})`} items={blocked} />
          <RiskList title={`Release blockers (${releaseBlockers.length})`} items={releaseBlockers} />
          <RiskList title={`Vencidas (${overdue.length})`} items={overdue} />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">Aging del backlog</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">ID</th>
                  <th className="px-3 py-2 font-medium">Título</th>
                  <th className="px-3 py-2 font-medium">Equipo</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Prio.</th>
                  <th className="px-3 py-2 font-medium">Creada</th>
                  <th className="px-3 py-2 font-medium text-right">Días</th>
                </tr>
              </thead>
              <tbody>
                {aging.map(c=>{
                  const days = Math.floor((Date.now()-new Date(c.created_at).getTime())/86400000);
                  return (
                    <tr key={c.id} className="border-t border-border/60">
                      <td className="px-3 py-2 mono text-xs">{c.work_item_id}</td>
                      <td className="px-3 py-2">{c.name}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{c.team}</td>
                      <td className="px-3 py-2"><StatusBadge value={c.status} /></td>
                      <td className="px-3 py-2"><PriorityBadge value={c.priority} /></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(c.created_at)}</td>
                      <td className="px-3 py-2 text-right mono tabular-nums">{days}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Matriz riesgo × prioridad</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th></th>
                    {PRI_ORDER.map(p=><th key={p} className="px-3 py-2 text-xs text-muted-foreground">{p}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map(row=>(
                    <tr key={row.risk}>
                      <td className="px-3 py-2 text-xs"><RiskBadge value={row.risk} /></td>
                      {row.cells.map((n,i)=>{
                        const bg = n===0 ? "bg-muted/30" : n<3 ? "bg-info/20" : n<6 ? "bg-warning/25" : "bg-destructive/30";
                        return (
                          <td key={i} className="px-1 py-1">
                            <div className={`h-12 rounded-md ${bg} border border-border grid place-items-center text-lg font-semibold tabular-nums`}>{n}</div>
                          </td>
                        );
                      })}
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

function RiskList({ title, items }: { title: string; items: ReturnType<typeof useSuspenseQuery<typeof dashboardQuery>>["data"]["cards"] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="p-0 max-h-72 overflow-auto">
        {items.length===0 && <div className="p-4 text-xs text-muted-foreground">Sin elementos.</div>}
        <ul className="divide-y divide-border">
          {items.map(c=>(
            <li key={c.id} className="px-3 py-2 flex items-center gap-2">
              <span className="mono text-xs text-muted-foreground w-16 shrink-0">{c.work_item_id}</span>
              <span className="text-sm flex-1 truncate">{c.name}</span>
              <PriorityBadge value={c.priority} />
              <RiskBadge value={c.risk} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
