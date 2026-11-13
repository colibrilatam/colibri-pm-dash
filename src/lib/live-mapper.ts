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
  "en curso": "In Progress",
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

function teamFromBoard(boardName?: string | null): Team {
  const value = boardName?.trim();
  return value || "Unknown";
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

interface AnyRec {
  [k: string]: unknown;
}

function str(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function textOrEmpty(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function trelloShortLink(url: string): string {
  return url.match(/\/c\/([^/?#]+)/i)?.[1] ?? "";
}

/**
 * Trello is the source of truth for identity. If n8n loses `id`, use the
 * short link or board + short number as an internal stable key and surface a
 * warning instead of discarding the complete report.
 */
function cardIdentity(card: AnyRec): { id: string; derived: boolean; shortLink: string } | null {
  const explicit = textOrEmpty(card["id"]);
  if (explicit) return { id: explicit, derived: false, shortLink: explicit };

  const url = textOrEmpty(card["url"]);
  const shortLink = trelloShortLink(url);
  if (shortLink) return { id: `trello:${shortLink}`, derived: true, shortLink };

  const boardId = textOrEmpty(card["board_id"]);
  const number = Number(card["number"]);
  if (boardId && Number.isFinite(number) && number > 0) {
    return { id: `trello:${boardId}:short-${number}`, derived: true, shortLink: "" };
  }

  return null;
}

export function mapActivityReport(json: unknown): {
  cards: PMCard[];
  events: TrelloNormalizedEventV2[];
  evidences: Evidence[];
  warnings: string[];
} {
  const root = (json ?? {}) as AnyRec;
  const rawCards = Array.isArray(root["cards"]) ? (root["cards"] as AnyRec[]) : [];
  const rawEvents = Array.isArray(root["events"]) ? (root["events"] as AnyRec[]) : [];
  const warnings: string[] = [];

  const boardByCardId = new Map<string, string>();
  rawEvents.forEach((event) => {
    const card = (event["card"] as AnyRec | undefined) ?? {};
    const board = (event["board"] as AnyRec | undefined) ?? {};
    const cardId = textOrEmpty(card["id"]);
    const boardName = textOrEmpty(board["name"]);
    if (cardId && boardName) boardByCardId.set(cardId, boardName);
  });

  const cards: PMCard[] = rawCards.flatMap((c, index) => {
    const identity = cardIdentity(c);
    if (!identity) {
      warnings.push(`Se omitió cards.${index}: falta una identidad Trello utilizable.`);
      return [];
    }
    const list = (c["current_list_name"] as string | null) ?? null;
    const status = statusFromList(list);
    const actors = (c["actors"] as string[] | undefined) ?? [];
    const reopenings = c["reopenings"] == null ? null : Number(c["reopenings"]);
    const total = Number(c["total_events"] ?? 0);
    const health: Health = status === "Blocked" ? "Red" : "Unknown";
    const url = str(c["url"], "");
    const boardId = textOrEmpty(c["board_id"]);
    const boardName = textOrEmpty(c["board_name"]) || boardByCardId.get(textOrEmpty(c["id"])) || "";
    if (identity.derived) {
      warnings.push(`cards.${index}.id no llegó; se usó una identidad derivada de Trello.`);
    }
    return [
      {
        id: identity.id,
        work_item_id: `#${str(c["number"], "?")}`,
        name: str(c["name"], "(sin título)"),
        team: teamFromBoard(boardName),
        priority: "Unknown",
        status,
        risk: "Unknown",
        owner: actors[0] ?? "Sin asignar",
        sprint: "—",
        estimate: null,
        release_blocker: null,
        evidence_required: null,
        has_evidence: null,
        reopenings,
        dependencies: [],
        repository: boardName || "—",
        board: boardName || "Sin tablero",
        board_id: boardId,
        target_release: "—",
        environment: "—",
        health,
        created_at: str(c["first_activity"], ""),
        updated_at: str(c["last_activity"], ""),
        completed_at: undefined,
        short_link: identity.shortLink || url.split("/").pop() || "",
        description: `${total} eventos · ${str(c["transitions"], "0")} transiciones · ${reopenings ?? "N/D"} reapertura(s)`,
      } satisfies PMCard,
    ];
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
            before: {
              raw: change["before_raw"] ?? change["before"] ?? null,
              normalized: change["before"] ?? null,
              display: before,
            },
            after: {
              raw: change["after_raw"] ?? change["after"] ?? null,
              normalized: change["after"] ?? null,
              display: after,
            },
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
      category: str(e["category"], group),
      occurred_at: str(e["occurred_at"], new Date().toISOString()),
      received_at: str(e["received_at"], str(e["occurred_at"], new Date().toISOString())),
      board: {
        id: str(board["id"], ""),
        name: str(board["name"], "—"),
        short_link: str(board["short_link"], ""),
      },
      card: {
        id: str(card["id"], ""),
        id_short: Number(card["number"] ?? 0),
        name: str(card["name"], "—"),
        short_link: str(card["short_link"], ""),
        id_list: str(card["current_list_id"], ""),
      },
      actor: {
        id: str(actor["id"], ""),
        full_name: str(actor["name"], "—"),
        username: str(actor["username"], ""),
      },
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

  const completionByCard = new Map<string, string>();
  events
    .filter((event) => event.category === "completion")
    .forEach((event) => {
      const raw = event.raw as AnyRec | undefined;
      const change = (raw?.["change"] as AnyRec | undefined) ?? {};
      const action = str(raw?.["action_label"], "").toLowerCase();
      const afterRaw = change["after_raw"];
      const isCompletion =
        afterRaw === true || (action.includes("complet") && !action.includes("reabiert"));
      if (isCompletion && event.card.id) completionByCard.set(event.card.id, event.occurred_at);
    });
  cards.forEach((card) => {
    if (card.status === "Done") card.completed_at = completionByCard.get(card.id);
  });

  const evidences: Evidence[] = Array.isArray(root["evidences"])
    ? (root["evidences"] as Evidence[])
    : [];
  return { cards, events, evidences, warnings };
}
