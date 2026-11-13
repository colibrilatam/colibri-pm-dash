# Changelog

Todas las versiones relevantes de este proyecto se documentan en este fichero. Los cambios de seguridad y de contrato de datos deben quedar reflejados también en GitHub Issues.

## [0.1.1] - 2026-11-13

Parche de integración con datos reales de Trello.

### Corregido

- Una tarjeta con `id: null` ya no invalida todo el payload; se usa una identidad derivada de URL/board y se muestra una advertencia de calidad.
- Los equipos live se derivan de `board_name` del tablero Trello, no de palabras dentro de listas o títulos.
- La vista de Equipos y las métricas reflejan tableros recibidos dinámicamente, sin equipos ficticios vacíos.

### Verificado

- `bun test` — 6 pruebas.
- `bun x tsc --noEmit`.
- `bun run lint` — 0 errores.
- `bun run build`.

## [0.1.0] - 2026-11-13

Primera release funcional del dashboard operativo.

### Añadido

- Validación runtime del contrato de actividad con Zod.
- Estados explícitos `LIVE`, `STALE`, `DEMO` y `UNAVAILABLE`.
- Dataset demo determinista y separado de los datos reales.
- Filtros funcionales de búsqueda, periodo y sprint.
- Métricas derivadas únicamente de timestamps y eventos observados.
- Kanban de solo lectura con Inbox y Cancelled.
- Pruebas de contrato, filtros y métricas de flujo.
- README con identidad visual, badges, instalación y límites operativos.

### Verificado

- `bun test`
- `bun x tsc --noEmit`
- `bun run lint`
- `bun run build`

### Pendiente

- Proxy server-side autenticado y autorización por tenant/board.
- Retirar `.env.local` del índice Git y activar secret scanning.
- CI de calidad y QA E2E visual/responsive.
