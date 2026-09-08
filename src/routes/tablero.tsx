import { createFileRoute } from "@tanstack/react-router";
import { dashboardQuery } from "@/lib/query";
import { useDashboard } from "@/lib/board-filter";
import { AppLayout } from "@/components/app-layout";
import type { PMCard, Status } from "@/lib/types";
import { PriorityBadge, RiskBadge } from "@/components/badges";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { fmtDate } from "@/lib/format";
import { FileCheck2, FileX2, LinkIcon } from "lucide-react";

const COLS: Status[] = ["Backlog","Ready","In Progress","Review / QA","Blocked","Done"];

export const Route = createFileRoute("/tablero")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  head: () => ({ meta: [{ title: "Tablero · Colibrí OS" }, { name: "description", content: "Vista Kanban de solo lectura del board Colibrí OS." }] }),
  component: TableroPage,
});

function TableroPage() {
  const data = useDashboard();
  const [open, setOpen] = useState<PMCard | null>(null);

  return (
    <AppLayout>
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Tablero</h1>
        <div className="w-full max-w-full overflow-x-auto overflow-y-hidden board-scroll -mx-4 md:-mx-6 px-4 md:px-6">
          <div className="flex gap-3 w-max pb-3">
            {COLS.map(col => {
              const items = data.cards.filter(c=>c.status===col);
              return (
                <div key={col} className="w-72 shrink-0 flex flex-col">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="text-xs font-medium">{col}</div>
                    <div className="text-xs mono text-muted-foreground">{items.length}</div>
                  </div>
                  <div className="space-y-2 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1 board-scroll">
                    {items.map(c => (
                      <button
                        key={c.id}
                        onClick={()=>setOpen(c)}
                        className="w-full text-left surface-1 rounded-md p-3 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-[10px] mono text-muted-foreground">
                          <span>{c.work_item_id}</span>
                          <span>·</span>
                          <span>{c.team}</span>
                        </div>
                        <div className="text-sm font-medium mt-1 line-clamp-2">{c.name}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          <PriorityBadge value={c.priority} />
                          <RiskBadge value={c.risk} />
                          {c.release_blocker && <span className="text-[10px] mono text-destructive">RB</span>}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="truncate">{c.owner}</span>
                          <span>{c.due_date ? fmtDate(c.due_date) : "sin fecha"}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px]">
                          {c.evidence_required && (
                            c.has_evidence
                              ? <span className="text-success flex items-center gap-1"><FileCheck2 className="size-3" />evidencia</span>
                              : <span className="text-warning flex items-center gap-1"><FileX2 className="size-3" />falta ev.</span>
                          )}
                          {c.dependencies.length>0 && (
                            <span className="text-muted-foreground flex items-center gap-1"><LinkIcon className="size-3" />{c.dependencies.length} dep.</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Sheet open={!!open} onOpenChange={(v)=>!v && setOpen(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {open && (
            <>
              <SheetHeader>
                <div className="text-xs mono text-muted-foreground">{open.work_item_id} · {open.team}</div>
                <SheetTitle className="text-base">{open.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  <PriorityBadge value={open.priority} />
                  <RiskBadge value={open.risk} />
                </div>
                <Row k="Estado" v={open.status} />
                <Row k="Responsable" v={open.owner} />
                <Row k="Sprint" v={open.sprint} />
                <Row k="Estimación" v={`${open.estimate} pts`} />
                <Row k="Fecha límite" v={fmtDate(open.due_date)} />
                <Row k="Release blocker" v={open.release_blocker ? "Sí" : "No"} />
                <Row k="Evidencia requerida" v={open.evidence_required ? (open.has_evidence ? "Sí · aportada" : "Sí · pendiente") : "No"} />
                <Row k="Dependencias" v={open.dependencies.join(", ") || "—"} />
                <Row k="Repositorio" v={open.repository} />
                <Row k="GitHub" v={open.github_ref ?? "—"} />
                <Row k="Target release" v={open.target_release} />
                <Row k="Entorno" v={open.environment} />
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mt-3 mb-1">Descripción</div>
                  <p className="text-sm text-foreground/90">{open.description}</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 border-b border-border/60">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className="text-sm text-right">{v}</span>
    </div>
  );
}
