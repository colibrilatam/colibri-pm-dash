import { getDemoDataset, computeTeamMetrics } from "./demo-data";
import type { PMCard, TrelloNormalizedEventV2, Evidence, TeamMetrics } from "./types";

const API_URL = (import.meta.env.VITE_TRELLO_EVENTS_API_URL as string | undefined) ?? "";

export interface DashboardData {
  cards: PMCard[];
  events: TrelloNormalizedEventV2[];
  evidences: Evidence[];
  teams: TeamMetrics[];
  source: "live" | "demo";
  error?: string;
}

async function tryLive(): Promise<Partial<DashboardData> | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(API_URL, { method: "GET", headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // Expect { cards, events, evidences } — otherwise treat as unsupported
    if (json && Array.isArray(json.events) && Array.isArray(json.cards)) {
      return {
        cards: json.cards as PMCard[],
        events: json.events as TrelloNormalizedEventV2[],
        evidences: (json.evidences ?? []) as Evidence[],
        source: "live",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function loadDashboard(): Promise<DashboardData> {
  const live = await tryLive();
  if (live && live.cards && live.events) {
    const teams = computeTeamMetrics(live.cards);
    return { ...(live as DashboardData), teams };
  }
  const demo = getDemoDataset();
  return {
    cards: demo.cards,
    events: demo.events,
    evidences: demo.evidences,
    teams: computeTeamMetrics(demo.cards),
    source: "demo",
    error: API_URL ? "El endpoint configurado no devolvió el formato esperado. Mostrando datos demo." : undefined,
  };
}

export async function pingEndpoint(): Promise<{ ok: boolean; status?: number; message: string }> {
  if (!API_URL) return { ok: false, message: "No hay VITE_TRELLO_EVENTS_API_URL configurado." };
  try {
    const res = await fetch(API_URL, { method: "GET" });
    return { ok: res.ok, status: res.status, message: res.ok ? "Conexión correcta." : `Respuesta HTTP ${res.status}.` };
  } catch (e) {
    return { ok: false, message: `Error de red: ${(e as Error).message}` };
  }
}

export const API_URL_CONFIGURED = API_URL;
