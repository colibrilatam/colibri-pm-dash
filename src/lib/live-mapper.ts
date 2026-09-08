import type {
  PMCard,
  TrelloNormalizedEventV2,
  Evidence,
  Status,
  Team,
  Health,
  Operation,
} from "./types";

/** Mapea el informe `lovable.project_activity_report.v1` de n8n al modelo del panel. */

const STATUS_BY_LIST: Record<string, Status> = {
  hecho: "Done",
  done: "Done",
  "en proceso": "In Progress",
  "in progress": "In Progress",
  back: "Backlog",
  backlog: "Backlog",
  inbox: "Inbox",
  "review / qa": "Review / QA",
  bloqueado: "Blocked",
};

function statusFromList(list?: string | null): Status {
  if (!list) return "Inbox";
  const k = list.trim().toLowerCase();
  if (STATUS_BY_LIST[k]) return STATUS_BY_LIST[k];
  if (k.includes("hecho") || k.includes("done")) return "Done";
  if (k.includes("proceso") || k.includes("progress") || k.includes("doing")) return "In Progress";
  if (k.includes("revis") || k.includes("qa")) return "Review / QA";
  if (k.includes("bloq") || k.includes("block")) return "Blocked";
  if (k.includes("por hacer") || k.includes("todo")) return "Ready";
  return "Backlog";
}

function teamFromList(list?: string | null, name?: string): Team {
  const s = `${list ?? ""} ${name ?? ""}`.toLowerCase();
  if (s.includes("front")) return "Frontend";
  if (s.includes("back")) return "Backend";
  if (s.includes("qa") || s.includes("test")) return "QA";
  if (s.includes("segur") || s.includes("security")) return "Security";
  if (s.includes("devops") || s.includes("deploy")) return "DevOps";
  if (s.includes("doc")) return "Documentation";
  if (s.includes("ux") || s.includes("dise")) return "UX";
  if (s.includes("data") || s.includes("dato")) return "Data";
  if (s.includes("arquit")) return "Architecture";
  return "Product";
}

const OP_BY_FIELD: Record<string, Operation> = {
  member: "add",
  idList: "move",
  closed: "archive",
  dueComplete: "complete",
  desc: "update",
  name: "update",
  text: "add",
  pos: "move",
  state: "update",
};

const LABELS: Record<string, string> = {
  member: "Miembro",
  idList: "Lista",
  closed: "Archivado",
  dueComplete: "Completado",
  desc: "Descripción",
  name: "Título",
  text: "Comentario",
  pos: "Posición",
  state: "Estado",
  prefs: "Preferencias",
};

interface AnyRec { [k: string]: unknown }

function str(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function isActivityReport(json: unknown): boolean {
  const v = (json as AnyRec | null)?.["schema_version"];
  return typeof v === "string" && v.startsWith("lovable.project_activity_report");
}

export function mapActivityReport(json: unknown): {
  cards: PMCard[];
  events: TrelloNormalizedEventV2[];
  evidences: Evidence[];
} {
  const root = (json ?? {}) as AnyRec;
  const rawCards = Array.isArray(root["cards"]) ? (root["cards"] as AnyRec[]) : [];
  const rawEvents = Array.isArray(root["events"]) ? (root["events"] as AnyRec[]) : [];

  const cards: PMCard[] = rawCards.map((c) => {
    const list = (c["current_list_name"] as string | null) ?? null;
    const status = statusFromList(list);
    const actors = (c["actors"] as string[] | undefined) ?? [];
    const reopenings = Number(c["reopenings"] ?? 0);
    const total = Number(c["total_events"] ?? 0);
    const health: Health = reopenings > 1 ? "Red" : reopenings > 0 ? "Amber" : "Green";
    const url = str(c["url"], "");
    return {
      id: str(c["id"], ""),
      work_item_id: `#${str(c["number"], "?")}`,
      name: str(c["name"], "(sin título)"),
      team: teamFromList(list, str(c["name"], "")),
      priority: total >= 15 ? "P1" : total >= 6 ? "P2" : "P3",
      status,
      risk: reopenings > 1 ? "High" : reopenings > 0 ? "Medium" : "Low",
      owner: actors[0] ?? "Sin asignar",
      sprint: "—",
      estimate: Number(c["management_events"] ?? 0),
      release_blocker: false,
      evidence_required: false,
      has_evidence: false,
      dependencies: [],
      repository: str(c["board_name"], "—"),
      board: str(c["board_name"], "Sin tablero"),
      board_id: str(c["board_id"], ""),
      target_release: "—",
      environment: "—",
      health,
      created_at: str(c["first_activity"], new Date().toISOString()),
      updated_at: str(c["last_activity"], new Date().toISOString()),
      completed_at: status === "Done" ? str(c["last_activity"], "") || undefined : undefined,
      short_link: url.split("/").pop() ?? "",
      description: `${total} eventos · ${str(c["transitions"], "0")} transiciones · ${reopenings} reapertura(s)`,
    } satisfies PMCard;
  });

  const events: TrelloNormalizedEventV2[] = rawEvents.map((e) => {
    const card = (e["card"] as AnyRec | undefined) ?? {};
    const board = (e["board"] as AnyRec | undefined) ?? {};
    const actor = (e["actor"] as AnyRec | undefined) ?? {};
    const change = (e["change"] as AnyRec | undefined) ?? {};
    const field = str(change["field"], "");
    const operation: Operation = OP_BY_FIELD[field] ?? "update";
    const label = LABELS[field] ?? (field || "Evento");
    const group = str(e["category_label"], str(e["category"], "otros"));
    const before = str(change["before"], "—");
    const after = str(change["after"], "—");
    const item = field
      ? [
          {
            field,
            canonical_field: field,
            field_path: `card.${field}`,
            field_label: label,
            field_group: group,
            data_type: "string",
            operation,
            changed: before !== after,
            certainty: 1,
            before: { raw: change["before_raw"] ?? change["before"] ?? null, normalized: change["before"] ?? null, display: before },
            after: { raw: change["after_raw"] ?? change["after"] ?? null, normalized: change["after"] ?? null, display: after },
            delta: `${before} → ${after}`,
            summary: str(e["summary"], ""),
          },
        ]
      : [];
    return {
      schema_version: "2.0",
      event_id: str(e["event_id"], ""),
      event_type: str(e["event_type"], ""),
      event_name: str(e["action_label"], str(e["event_type"], "")),
      category: group,
      occurred_at: str(e["occurred_at"], new Date().toISOString()),
      received_at: str(e["received_at"], str(e["occurred_at"], new Date().toISOString())),
      board: { id: str(board["id"], ""), name: str(board["name"], "—"), short_link: str(board["short_link"], "") },
      card: {
        id: str(card["id"], ""),
        id_short: Number(card["number"] ?? 0),
        name: str(card["name"], "—"),
        short_link: str(card["short_link"], ""),
        id_list: str(card["current_list_id"], ""),
      },
      actor: { id: str(actor["id"], ""), full_name: str(actor["name"], "—"), username: str(actor["username"], "") },
      target: { type: "card", id: str(card["id"], ""), name: str(card["name"], "—") },
      field_change: {
        count: item.length,
        primary_field: field,
        primary_operation: operation,
        primary_group: group,
        items: item,
      },
      summary: str(e["summary"], str(e["action_label"], "")),
      raw: e,
    } satisfies TrelloNormalizedEventV2;
  });

  const evidences: Evidence[] = [];
  return { cards, events, evidences };
}
