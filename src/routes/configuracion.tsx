import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pingEndpoint, API_URL_CONFIGURED } from "@/lib/data-adapter";
import { useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracion")({
  head: () => ({ meta: [{ title: "Configuración · Colibrí OS" }, { name: "description", content: "Configura el endpoint de lectura y prueba la conexión." }] }),
  component: ConfigPage,
});

function ConfigPage() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; status?: number } | null>(null);

  const test = async () => {
    setTesting(true);
    const r = await pingEndpoint();
    setResult(r);
    setTesting(false);
    toast[r.ok ? "success" : "warning"](r.message);
  };

  return (
    <AppLayout>
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-xl font-semibold">Configuración</h1>

        <Card>
          <CardHeader><CardTitle className="text-sm">Endpoint de lectura de eventos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configura la variable <code className="mono">VITE_TRELLO_EVENTS_API_URL</code> con una URL que devuelva
              <code className="mono"> {`{ cards, events, evidences }`}</code> en formato JSON. Si no está definido
              o el endpoint no devuelve el formato esperado, la aplicación entra en <b>modo demostración</b>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
              <Input readOnly value={API_URL_CONFIGURED || "(no configurado)"} className="mono text-xs" />
              <Button onClick={test} disabled={testing || !API_URL_CONFIGURED}>
                {testing ? <Loader2 className="size-4 animate-spin" /> : "Probar conexión"}
              </Button>
            </div>
            {result && (
              <div className={`flex items-start gap-2 text-sm rounded-md border p-3 ${result.ok ? "border-success/40 bg-success/10 text-success" : "border-warning/40 bg-warning/10 text-warning"}`}>
                {result.ok ? <CheckCircle2 className="size-4 mt-0.5" /> : <XCircle className="size-4 mt-0.5" />}
                <div>
                  <div className="font-medium">{result.ok ? "Conexión correcta" : "Sin acceso"}</div>
                  <div className="text-xs">{result.message}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Contrato esperado del endpoint</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              El webhook actual <code className="mono">https://n8n.norug.es/webhook/trello-colibri</code> es el receptor
              POST de Trello. Para alimentar el dashboard necesitas un endpoint de <b>lectura/reporting</b>, por ejemplo:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li><code className="mono">GET /webhook/trello-dashboard</code> en n8n que consulte la base normalizada.</li>
              <li>Una API REST propia o Supabase que exponga la tabla <code className="mono">trello_events</code>.</li>
            </ul>
            <pre className="mono text-[11px] bg-muted/40 border border-border rounded-md p-3 overflow-auto">
{`{
  "cards": PMCard[],
  "events": TrelloNormalizedEventV2[],
  "evidences": Evidence[]
}`}
            </pre>
            <p className="text-xs text-muted-foreground">
              Los tipos completos están en <code className="mono">src/lib/types.ts</code>. Nunca incluyas claves
              Trello, tokens o service_role en el frontend.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
