import { getDemoDataset, computeTeamMetrics } from "./demo-data";
import { activityReportSchema, dashboardPayloadSchema, formatSchemaError } from "./schemas";
import { mapActivityReport } from "./live-mapper";
import type { PMCard, TrelloNormalizedEventV2, Evidence, TeamMetrics } from "./types";

const API_URL = ((import.meta.env.VITE_TRELLO_EVENTS_API_URL as string | undefined) ?? "").trim();
const ALLOW_DEMO = import.meta.env.VITE_ENABLE_DEMO_DATA === "true";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_CHARS = 12_000_000;

export type DashboardSource = "live" | "stale" | "demo" | "unavailable";

export interface DashboardData {
  cards: PMCard[];
  events: TrelloNormalizedEventV2[];
  evidences: Evidence[];
  teams: TeamMetrics[];
  source: DashboardSource;
  generatedAt?: string;
  error?: string;
  warnings?: string[];
}

let lastError: string | undefined;
let lastLiveData: DashboardData | undefined;

function emptyDashboard(source: "unavailable" | "demo", error?: string): DashboardData {
  return {
    cards: [],
    events: [],
    evidences: [],
    teams: computeTeamMetrics([]),
    source,
    error,
  };
}

async function requestEndpoint() {
  if (!API_URL) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const text = await res.text();
    if (text.length > MAX_RESPONSE_CHARS) {
      throw new Error("La respuesta supera el límite de tamaño permitido.");
    }
    return { res, text };
  } finally {
    clearTimeout(timeout);
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("El endpoint no devolvió JSON válido.");
  }
}

function httpError(status: number, text: string): string {
  let detail = text.slice(0, 200);
  try {
    const json = JSON.parse(text) as { message?: unknown; error?: unknown };
    detail = String(json.message ?? json.error ?? detail);
  } catch {
    /* respuesta no JSON */
  }
  return `El endpoint respondió HTTP ${status}${detail ? ` — ${detail}` : ""}.`;
}

async function tryLive(): Promise<DashboardData | null> {
  lastError = undefined;
  if (!API_URL) {
    lastError = "No hay endpoint de lectura configurado.";
    return null;
  }

  try {
    const result = await requestEndpoint();
    if (!result) return null;
    const { res, text } = result;
    if (!res.ok) {
      lastError = httpError(res.status, text);
      return null;
    }
    const json = parseJson(text);

    const report = activityReportSchema.safeParse(json);
    if (report.success) {
      const mapped = mapActivityReport(report.data);
      const data: DashboardData = {
        ...mapped,
        teams: computeTeamMetrics(mapped.cards),
        source: "live",
        generatedAt: report.data.generated_at,
      };
      lastLiveData = data;
      return data;
    }

    const payload = dashboardPayloadSchema.safeParse(json);
    if (payload.success) {
      const cards = payload.data.cards.map((card) => ({
        ...card,
        reopenings: card.reopenings ?? null,
      })) as PMCard[];
      const data: DashboardData = {
        cards,
        events: payload.data.events as TrelloNormalizedEventV2[],
        evidences: (payload.data.evidences ?? []) as Evidence[],
        teams: computeTeamMetrics(cards),
        source: "live",
      };
      lastLiveData = data;
      return data;
    }

    lastError = formatSchemaError(report.error);
    return null;
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Error desconocido de red.";
    return null;
  }
}

export async function loadDashboard(): Promise<DashboardData> {
  const live = await tryLive();
  if (live) return live;

  if (lastLiveData) {
    return { ...lastLiveData, source: "stale", error: lastError };
  }

  if (ALLOW_DEMO) {
    const demo = getDemoDataset();
    return {
      cards: demo.cards,
      events: demo.events,
      evidences: demo.evidences,
      teams: computeTeamMetrics(demo.cards),
      source: "demo",
      error: API_URL ? lastError : "Modo demo explícito mediante VITE_ENABLE_DEMO_DATA=true.",
    };
  }

  return emptyDashboard("unavailable", lastError);
}

export async function pingEndpoint(): Promise<{ ok: boolean; status?: number; message: string }> {
  if (!API_URL) return { ok: false, message: "No hay VITE_TRELLO_EVENTS_API_URL configurado." };
  try {
    const result = await requestEndpoint();
    if (!result) return { ok: false, message: "No hay endpoint configurado." };
    const { res, text } = result;
    if (!res.ok) return { ok: false, status: res.status, message: httpError(res.status, text) };

    const json = parseJson(text);
    const valid =
      activityReportSchema.safeParse(json).success ||
      dashboardPayloadSchema.safeParse(json).success;
    return {
      ok: valid,
      status: res.status,
      message: valid
        ? "Conexión correcta y contrato válido."
        : "Respondió 200 pero no cumple el contrato versionado.",
    };
  } catch (error) {
    return {
      ok: false,
      message: `Error de red: ${error instanceof Error ? error.message : "desconocido"}.`,
    };
  }
}

export const API_URL_CONFIGURED = API_URL;
