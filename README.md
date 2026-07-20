# Colibrí OS — Trello PM Dashboard

Dashboard operativo para visualizar el avance de equipos y la trazabilidad de eventos de Trello procesados por n8n, con modelo normalizado V2.

## Instalación

```bash
bun install
bun run dev
```

## Variables de entorno

Crea un fichero `.env.local` en la raíz con:

```
VITE_TRELLO_EVENTS_API_URL=https://tu-endpoint-de-lectura.example.com/trello-dashboard
```

Si la variable no está definida, o el endpoint no devuelve el formato esperado, la aplicación arranca en **modo demostración** con un dataset realista (38 tarjetas, 90+ eventos, evidencias).

> El webhook actual `https://n8n.norug.es/webhook/trello-colibri` es el **receptor POST** de Trello. Para alimentar el dashboard necesitas un endpoint de **lectura/reporting** distinto — por ejemplo `GET /webhook/trello-dashboard` en n8n, o una API REST/Supabase que exponga la tabla normalizada `trello_events`.

**Nunca** incrustes claves de Trello, tokens de Supabase o `service_role` en el frontend. El adaptador de datos hace únicamente `GET` sobre la URL configurada; toda autenticación privilegiada debe realizarse en el backend.

## Contrato esperado del endpoint

`GET` que devuelve `application/json`:

```json
{
  "cards": [PMCard, ...],
  "events": [TrelloNormalizedEventV2, ...],
  "evidences": [Evidence, ...]
}
```

Los tipos completos están en [`src/lib/types.ts`](./src/lib/types.ts):

- `TrelloNormalizedEventV2` con `schema_version`, `event_id`, `board`, `card`, `actor`, `target`, `field_change.items[]` y `summary`.
- `PMCard` con `work_item_id`, `team`, `priority`, `status`, `risk`, `sprint`, `estimate`, `release_blocker`, `evidence_required`, `dependencies`, `repository`, `target_release`, `environment`, `health`.
- `Evidence` con `type` (`commit | pull_request | ci | deployment | release | security | document | test`), `hash`, `actor`, `environment`, `result`, `date`, `url`.

## Arquitectura

- TanStack Start + Router + Query
- Tailwind v4 + shadcn/ui + Recharts
- Adaptador de datos centralizado en [`src/lib/data-adapter.ts`](./src/lib/data-adapter.ts) que:
  1. intenta `GET` al endpoint configurado,
  2. valida el formato,
  3. cae a datos demo si no está disponible y muestra el aviso “Modo demostración”,
  4. expone `pingEndpoint()` para el botón **Probar conexión** en `Configuración`.

## Páginas

- **Resumen** · KPIs, distribución por estado, throughput, trabajo por equipo, prioridad, riesgo, lead/cycle time.
- **Equipos** · WIP, salud, carga por miembro, alertas de WIP superado.
- **Tablero** · Kanban de solo lectura con drawer de detalle.
- **Actividad** · Timeline / tabla con filtros por operación y categoría, JSON normalizado + raw, copia de `event_id`.
- **Riesgos** · P0/P1 abiertos, bloqueadas, release blockers, vencidas, aging, matriz riesgo × prioridad.
- **Evidencias** · Trazabilidad y resaltado de Done sin evidencia requerida.
- **Métricas** · Throughput, lead/cycle time, WIP, reaperturas, DoD, actividad por miembro, tendencia por sprint.
- **Configuración** · Estado del endpoint, prueba de conexión, contrato esperado.
