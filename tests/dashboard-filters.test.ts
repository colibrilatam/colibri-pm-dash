import { describe, expect, test } from "bun:test";
import { filterByDashboardControls } from "../src/lib/dashboard-filters";
import type { DashboardData } from "../src/lib/data-adapter";

const baseCard = {
  id: "card-1",
  work_item_id: "PM-001",
  name: "Contrato API",
  team: "Backend" as const,
  priority: "P1" as const,
  status: "In Progress" as const,
  risk: "Low" as const,
  owner: "Ana",
  sprint: "S-1",
  estimate: 3,
  release_blocker: false,
  evidence_required: false,
  has_evidence: true,
  reopenings: 0,
  dependencies: [],
  repository: "org/api",
  target_release: "2026.1",
  environment: "dev",
  health: "Green" as const,
  created_at: "2026-11-01T00:00:00.000Z",
  updated_at: "2026-11-12T00:00:00.000Z",
  short_link: "card-1",
  description: "Contrato",
};

const data: DashboardData = {
  cards: [
    baseCard,
    {
      ...baseCard,
      id: "card-2",
      work_item_id: "PM-002",
      name: "Diseño UX",
      team: "UX",
      sprint: "S-2",
      owner: "Luis",
    },
  ],
  events: [
    {
      schema_version: "2.0.0",
      event_id: "event-1",
      event_type: "updateCard",
      event_name: "Cambio",
      category: "transition",
      occurred_at: "2026-11-12T00:00:00.000Z",
      received_at: "2026-11-12T00:00:00.000Z",
      board: { id: "board", name: "Colibrí OS", short_link: "board" },
      card: {
        id: "card-1",
        id_short: 1,
        name: "Contrato API",
        short_link: "card-1",
        id_list: "list",
      },
      actor: { id: "actor", full_name: "Ana", username: "ana" },
      target: { type: "card", id: "card-1", name: "Contrato API" },
      field_change: {
        count: 0,
        primary_field: "",
        primary_operation: "update",
        primary_group: "",
        items: [],
      },
      summary: "Cambio",
    },
  ],
  evidences: [],
  teams: [],
  source: "live",
};

describe("dashboard filters", () => {
  test("filters the shared dashboard by sprint", () => {
    const result = filterByDashboardControls(data, { query: "", range: "all", sprint: "S-2" });
    expect(result.cards.map((card) => card.id)).toEqual(["card-2"]);
    expect(result.events).toHaveLength(0);
  });

  test("filters activity by search without changing the source state", () => {
    const result = filterByDashboardControls(data, { query: "ana", range: "all", sprint: "all" });
    expect(result.source).toBe("live");
    expect(result.cards.map((card) => card.id)).toEqual(["card-1"]);
    expect(result.events).toHaveLength(1);
  });
});
