import { getDemoDataset, computeTeamMetrics } from "./demo-data";
import { isActivityReport, mapActivityReport } from "./live-mapper";
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

let lastError: string | undefined;

async function tryLive(): Promise<Partial<DashboardData> | null> {
  lastError = undefined;
  if (!API_URL) return null;
  try {
    const res = await fetch(API_URL, { method: "GET", headers: { accept: "application/json" } });
    const text = await res.text();
    if (!res.ok) {
      let detail = text.slice(0, 200);
      try {
        const j = JSON.parse(text);
        detail = j.message ?? j.error ?? detail;
      } catch {
        /* texto plano */
      }
      lastError = `El endpoint respondió HTTP ${res.status}${detail ? ` — ${detail}` : ""}.`;
      return null;
    }
    const json = JSON.parse(text);
    // Formato de informe de actividad de n8n
    if (isActivityReport(json)) {
      const mapped = mapActivityReport(json);
      if (mapped.cards.length || mapped.events.length) {
        return { ...mapped, source: "live" };
      }
      lastError = "El endpoint respondió sin tarjetas ni eventos.";
      return null;
    }
    // Expect { cards, events, evidences } — otherwise treat as unsupported
    if (json && Array.isArray(json.events) && Array.isArray(json.cards)) {
      return {
        cards: json.cards as PMCard[],
        events: json.events as TrelloNormalizedEventV2[],
        evidences: (json.evidences ?? []) as Evidence[],
        source: "live",
      };
    }
    lastError = "El endpoint respondió 200 pero sin el formato esperado { cards, events, evidences }.";
    return null;
  } catch (e) {
    lastError = `No se pudo contactar el endpoint: ${(e as Error).message}.`;
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
    error: API_URL ? lastError : undefined,
  };
}

export async function pingEndpoint(): Promise<{ ok: boolean; status?: number; message: string }> {
  if (!API_URL) return { ok: false, message: "No hay VITE_TRELLO_EVENTS_API_URL configurado." };
  try {
    const res = await fetch(API_URL, { method: "GET", headers: { accept: "application/json" } });
    const text = await res.text();
    let detail = text.slice(0, 300);
    try {
      const j = JSON.parse(text);
      detail = j.message ?? j.error ?? detail;
    } catch {
      /* texto plano */
    }
    if (res.ok) {
      const okFormat = (() => {
        try {
          const j = JSON.parse(text);
          return Array.isArray(j?.cards) && Array.isArray(j?.events);
        } catch {
          return false;
        }
      })();
      return {
        ok: okFormat,
        status: res.status,
        message: okFormat
          ? "Conexión correcta y formato válido."
          : "Respondió 200 pero sin el formato { cards, events, evidences }.",
      };
    }
    return { ok: false, status: res.status, message: `Respuesta HTTP ${res.status}${detail ? ` — ${detail}` : ""}.` };
  } catch (e) {
    return { ok: false, message: `Error de red: ${(e as Error).message}` };
  }
}

export const API_URL_CONFIGURED = API_URL;
