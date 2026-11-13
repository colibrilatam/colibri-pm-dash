import { describe, expect, test } from "bun:test";
import { getDemoDataset } from "../src/lib/demo-data";
import { computeFlowMetrics } from "../src/lib/metrics";
import { mapActivityReport } from "../src/lib/live-mapper";
import { activityReportSchema } from "../src/lib/schemas";
import type { PMCard, TrelloNormalizedEventV2 } from "../src/lib/types";

const report = {
  schema_version: "lovable.project_activity_report.v1",
  generated_at: "2026-11-13T12:00:00.000Z",
  cards: [
    {
      id: "card-1",
      number: 1,
      name: "Implementar contrato",
      url: "https://trello.com/c/card-1",
      board_name: "Colibrí OS",
      total_events: 3,
      management_events: 2,
      actors: ["Ana"],
      current_list_id: "list-done",
      current_list_name: "Hecho",
      first_activity: "2026-11-01T10:00:00.000Z",
      last_activity: "2026-11-13T10:00:00.000Z",
      transitions: 2,
      reopenings: 0,
    },
  ],
  events: [
    {
      event_id: "event-1",
      event_type: "updateCard",
      category: "completion",
      category_label: "Finalización",
      action_label: "Tarea completada",
      occurred_at: "2026-11-12T10:00:00.000Z",
      received_at: "2026-11-12T10:00:01.000Z",
      board: { id: "board-1", name: "Colibrí OS", short_link: "colibri" },
      card: {
        id: "card-1",
        number: 1,
        name: "Implementar contrato",
        short_link: "card-1",
        current_list_id: "list-done",
      },
      actor: { id: "actor-1", name: "Ana", username: "ana" },
      change: {
        field: "dueComplete",
        before: "No",
        after: "Sí",
        before_raw: false,
        after_raw: true,
      },
      summary: "Tarea completada",
    },
  ],
  evidences: [],
};

describe("dashboard data contracts", () => {
  test("accepts the activity report and maps unknown PM semantics honestly", () => {
    expect(activityReportSchema.safeParse(report).success).toBe(true);
    const mapped = mapActivityReport(report);
    expect(mapped.cards[0]?.status).toBe("Done");
    expect(mapped.cards[0]?.priority).toBe("Unknown");
    expect(mapped.cards[0]?.risk).toBe("Unknown");
    expect(mapped.cards[0]?.estimate).toBeNull();
    expect(mapped.cards[0]?.completed_at).toBe("2026-11-12T10:00:00.000Z");
  });

  test("keeps the deterministic demo dataset coherent", () => {
    const data = getDemoDataset();
    const cardsById = new Map(data.cards.map((card) => [card.id, card]));
    expect(data.cards).toHaveLength(38);
    expect(data.events.length).toBeGreaterThanOrEqual(90);
    expect(
      data.events.every((event) => {
        const card = cardsById.get(event.card.id);
        return !!card && Date.parse(event.occurred_at) >= Date.parse(card.created_at);
      }),
    ).toBe(true);
  });
});

describe("observed flow metrics", () => {
  test("derives lead and cycle time from observed timestamps", () => {
    const card: PMCard = {
      id: "card-1",
      work_item_id: "PM-001",
      name: "Trabajo",
      team: "Product",
      priority: "P1",
      status: "Done",
      risk: "Low",
      owner: "Ana",
      sprint: "S-1",
      estimate: 3,
      release_blocker: false,
      evidence_required: false,
      has_evidence: true,
      reopenings: 1,
      dependencies: [],
      repository: "org/repo",
      target_release: "2026.1",
      environment: "prod",
      health: "Green",
      created_at: "2026-11-01T00:00:00.000Z",
      updated_at: "2026-11-04T00:00:00.000Z",
      completed_at: "2026-11-05T00:00:00.000Z",
      short_link: "card-1",
      description: "Trabajo",
    };
    const event: TrelloNormalizedEventV2 = {
      schema_version: "2.0.0",
      event_id: "event-1",
      event_type: "updateCard",
      event_name: "Tarjeta movida",
      category: "transition",
      occurred_at: "2026-11-02T00:00:00.000Z",
      received_at: "2026-11-02T00:00:00.000Z",
      board: { id: "b", name: "Colibrí OS", short_link: "b" },
      card: {
        id: "card-1",
        id_short: 1,
        name: "Trabajo",
        short_link: "card-1",
        id_list: "in-progress",
      },
      actor: { id: "a", full_name: "Ana", username: "ana" },
      target: { type: "card", id: "card-1", name: "Trabajo" },
      field_change: {
        count: 1,
        primary_field: "idList",
        primary_operation: "move",
        primary_group: "workflow",
        items: [
          {
            field: "idList",
            canonical_field: "idList",
            field_path: "card.idList",
            field_label: "Lista",
            field_group: "workflow",
            data_type: "reference",
            operation: "move",
            changed: true,
            certainty: 1,
            before: { raw: "Backlog", normalized: "Backlog", display: "Backlog" },
            after: { raw: "En curso", normalized: "En curso", display: "En curso" },
            delta: "Backlog → En curso",
            summary: "movida",
          },
        ],
      },
      summary: "Tarjeta movida",
    };
    const [metric] = computeFlowMetrics([card], [event]);
    expect(metric?.lead).toBe(4);
    expect(metric?.cycle).toBe(3);
    expect(metric?.reopenings).toBe(1);
  });
});
