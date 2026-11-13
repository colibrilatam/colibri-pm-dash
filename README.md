<!-- readme-pro-header:start -->
<div align="center">
  <img src="docs/assets/readme-banner.png" alt="Colibrí OS — Trello PM Dashboard banner" width="100%">
  <br>
  <h1>Colibrí OS — Trello PM Dashboard</h1>
  <strong>Torre de control operativa para flujo, riesgos y trazabilidad de proyectos</strong>
  <br>
  <br>
  <img alt="badge" src="https://img.shields.io/badge/version-0.1.0-00B8D9?style=for-the-badge&logo=semanticrelease&logoColor=white">
  <a href="https://www.typescriptlang.org/"><img alt="badge" src="https://img.shields.io/badge/built%20with-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"></a>
  <br><br>
  <a href="https://github.com/colibrilatam/colibri-pm-dash/issues">Issues</a> &nbsp;&middot;&nbsp; <a href="https://github.com/colibrilatam/colibri-pm-dash">Source</a>
</div>
<!-- readme-pro-header:end -->

<p align="center">
  <img src="public/favicon.ico" alt="Logo Colibrí OS" width="72">
</p>

[![Latest release](https://img.shields.io/github/v/release/colibrilatam/colibri-pm-dash?display_name=tag&style=flat-square)](https://github.com/colibrilatam/colibri-pm-dash/releases)
[![Open issues](https://img.shields.io/github/issues/colibrilatam/colibri-pm-dash?style=flat-square)](https://github.com/colibrilatam/colibri-pm-dash/issues)

Dashboard operativo de solo lectura para visualizar el avance de equipos y la trazabilidad de eventos de Trello procesados por n8n, con modelo normalizado V2.

## Qué controla

- Flujo de trabajo: WIP, estados, throughput, lead time y cycle time cuando existen timestamps observables.
- Riesgo operativo: bloqueos, prioridades, salud de equipos, aging y release blockers.
- Trazabilidad: actividad normalizada, eventos raw, actores, enlaces y evidencias.
- Calidad de datos: contrato runtime, frescura del snapshot, estado `LIVE`, `STALE`, `DEMO` o `UNAVAILABLE`.

La aplicación no modifica Trello. Es una superficie de observación y decisión; las acciones deben ejecutarse en los sistemas autorizados y quedar registradas como evidencia.

## Release actual

La primera versión semántica de esta base es **v0.1.0**. Consulta el [release v0.1.0](https://github.com/colibrilatam/colibri-pm-dash/releases/tag/v0.1.0) y el [seguimiento de trabajo](https://github.com/colibrilatam/colibri-pm-dash/issues).

## Instalación

```bash
bun install
bun run dev
```

## Variables de entorno

Crea un fichero `.env.local` en la raíz con:

```
VITE_TRELLO_EVENTS_API_URL=https://tu-endpoint-de-lectura.example.com/trello-dashboard
# Solo para desarrollo local sin endpoint real:
VITE_ENABLE_DEMO_DATA=true
```

En ausencia de endpoint, la aplicación queda en **UNAVAILABLE**. El modo demostración debe activarse explícitamente con `VITE_ENABLE_DEMO_DATA=true` y nunca debe usarse para tomar decisiones operativas.

> El webhook actual `https://n8n.norug.es/webhook/trello-colibri` es el **receptor POST** de Trello. Para alimentar el dashboard necesitas un endpoint de **lectura/reporting** distinto — por ejemplo `GET /webhook/trello-dashboard` en n8n, o una API REST/Supabase que exponga la tabla normalizada `trello_events`.

**Nunca** incrustes claves de Trello, tokens de Supabase o `service_role` en el frontend. Las variables `VITE_*` son públicas. El endpoint debe estar protegido por un backend/proxy autenticado y el navegador solo debe recibir datos autorizados para el usuario y sus tableros.

El fichero [`.env.example`](./.env.example) documenta la configuración local. No versiona `.env.local` ni credenciales.

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
  2. valida el contrato en runtime con Zod,
  3. conserva el último snapshot válido como `STALE` si el endpoint falla,
  4. solo usa datos demo cuando `VITE_ENABLE_DEMO_DATA=true`,
  5. expone `pingEndpoint()` para el botón **Probar conexión** en `Configuración`.
- Las métricas operativas solo se muestran cuando pueden derivarse de timestamps/eventos observados. Los valores no presentes se representan como `Unknown`, `N/D` o `No probado`.

## Páginas

- **Resumen** · KPIs, distribución por estado, throughput, trabajo por equipo, prioridad, riesgo, lead/cycle time.
- **Equipos** · WIP, salud, carga por miembro, alertas de WIP superado.
- **Tablero** · Kanban de solo lectura con drawer de detalle.
- **Actividad** · Timeline / tabla con filtros por operación y categoría, JSON normalizado + raw, copia de `event_id`.
- **Riesgos** · P0/P1 abiertos, bloqueadas, release blockers, vencidas, aging, matriz riesgo × prioridad.
- **Evidencias** · Trazabilidad y resaltado de Done sin evidencia requerida.
- **Métricas** · Throughput, lead/cycle time, WIP, reaperturas, DoD, actividad por miembro, tendencia por sprint.
- **Configuración** · Estado del endpoint, prueba de conexión, contrato esperado.

## Calidad local

```bash
bun test
bun run typecheck
bun run lint
bun run build
```

El lint debe terminar sin errores. Los avisos de Fast Refresh de componentes shadcn/ui no bloquean la compilación, pero quedan registrados para limpieza posterior.

## Límites conocidos

- La autenticación, autorización por usuario/tenant/board y el proxy server-side del endpoint siguen pendientes.
- La validación visual completa en navegador y la integración CI quedan documentadas en [GitHub Issues](https://github.com/colibrilatam/colibri-pm-dash/issues).
- `DEMO` es únicamente un modo de desarrollo; los datos demo no representan actividad real.

## Licencia

No se ha declarado todavía una licencia de distribución para este repositorio.
