import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { dashboardQuery } from "@/lib/query";
import { AppLayout } from "@/components/app-layout";
import { OperationBadge } from "@/components/badges";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtDateTime, relative } from "@/lib/format";
import { useMemo, useState } from "react";
import type { TrelloNormalizedEventV2 } from "@/lib/types";
import { Copy, Check } from "lucide-react";

export const Route = createFileRoute("/actividad")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  head: () => ({ meta: [{ title: "Actividad · Colibrí OS" }, { name: "description", content: "Timeline de eventos normalizados de Trello." }] }),
  component: ActividadPage,
});

function ActividadPage() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const [q, setQ] = useState("");
  const [op, setOp] = useState("all");
  const [grp, setGrp] = useState("all");
  const [selected, setSelected] = useState<TrelloNormalizedEventV2 | null>(null);
  const [copied, setCopied] = useState(false);

  const rows = useMemo(() => {
    return (data.events ?? []).flatMap(e => (e.field_change?.items ?? []).map(it => ({ e, it })))
      .filter(({e,it}) => {
        if (op !== "all" && it.operation !== op) return false;
        if (grp !== "all" && it.field_group !== grp) return false;
        if (q) {
          const s = q.toLowerCase();
          return [e.actor?.full_name, e.card?.name, it.field_label, e.summary]
            .some(v => (v ?? "").toLowerCase().includes(s));
        }
        return true;
      });
  }, [data.events, q, op, grp]);

  const groups = Array.from(new Set((data.events ?? []).flatMap(e=>(e.field_change?.items ?? []).map(i=>i.field_group)).filter(Boolean)));

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Actividad</h1>
          <div className="text-sm text-muted-foreground mono">{rows.length} cambios</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Buscar actor, tarjeta, campo…" value={q} onChange={e=>setQ(e.target.value)} className="max-w-xs h-9" />
          <Select value={op} onValueChange={setOp}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Operación" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las operaciones</SelectItem>
              {["set","update","clear","move","add","remove","complete","reopen","create","delete"].map(o=>
                <SelectItem key={o} value={o}>{o}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={grp} onValueChange={setGrp}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {groups.map(g=><SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Fecha</th>
                    <th className="px-3 py-2 font-medium">Actor</th>
                    <th className="px-3 py-2 font-medium">Tarjeta</th>
                    <th className="px-3 py-2 font-medium">Campo</th>
                    <th className="px-3 py-2 font-medium">Grupo</th>
                    <th className="px-3 py-2 font-medium">Op</th>
                    <th className="px-3 py-2 font-medium">Antes → Después</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 300).map(({e,it}, idx) => (
                    <tr key={e.event_id+idx} onClick={()=>setSelected(e)} className="border-t border-border/60 hover:bg-accent/40 cursor-pointer">
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                        <div>{relative(e.occurred_at)}</div>
                        <div className="mono">{fmtDateTime(e.occurred_at)}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{e.actor?.full_name ?? "—"}</td>
                      <td className="px-3 py-2 max-w-[220px] truncate">{e.card?.name ?? "—"}</td>
                      <td className="px-3 py-2 mono text-xs">{it.field_label ?? it.field ?? "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{it.field_group ?? "—"}</td>
                      <td className="px-3 py-2"><OperationBadge value={it.operation} /></td>
                      <td className="px-3 py-2 text-xs">
                        <span className="text-muted-foreground line-through">{it.before?.display ?? "—"}</span>
                        <span className="mx-1.5 text-muted-foreground">→</span>
                        <span className="text-foreground">{it.after?.display ?? "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(v)=>!v && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{selected?.summary}</DialogTitle>
          </DialogHeader>
          {selected && (
            <>
              <div className="flex items-center gap-2 text-xs mono text-muted-foreground">
                <span>event_id · {selected.event_id}</span>
                <button
                  onClick={()=>{ navigator.clipboard.writeText(selected.event_id); setCopied(true); setTimeout(()=>setCopied(false),1500); }}
                  className="hover:text-foreground"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                </button>
              </div>
              <Tabs defaultValue="normalized">
                <TabsList>
                  <TabsTrigger value="normalized">Normalizado</TabsTrigger>
                  <TabsTrigger value="raw">Raw</TabsTrigger>
                </TabsList>
                <TabsContent value="normalized">
                  <pre className="mono text-[11px] bg-muted/40 border border-border rounded-md p-3 max-h-96 overflow-auto">
{JSON.stringify(selected, null, 2)}
                  </pre>
                </TabsContent>
                <TabsContent value="raw">
                  <pre className="mono text-[11px] bg-muted/40 border border-border rounded-md p-3 max-h-96 overflow-auto">
{JSON.stringify(selected.raw ?? { note: "raw no disponible en modo demo" }, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
