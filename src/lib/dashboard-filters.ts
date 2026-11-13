import { useSyncExternalStore } from "react";
import { computeTeamMetrics } from "./demo-data";
import type { DashboardData } from "./data-adapter";

export type DateRange = "all" | "7d" | "14d" | "30d" | "90d";

export interface DashboardFilters {
  query: string;
  range: DateRange;
  sprint: string;
}

const DEFAULT_FILTERS: DashboardFilters = { query: "", range: "30d", sprint: "all" };
let filters = DEFAULT_FILTERS;
const listeners = new Set<() => void>();

function publish() {
  listeners.forEach((listener) => listener());
}

export function setDashboardFilters(next: Partial<DashboardFilters>) {
  filters = { ...filters, ...next };
  publish();
}

export function useDashboardFilters() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => filters,
    () => DEFAULT_FILTERS,
  );
}

function includesQuery(values: unknown[], query: string) {
  return values.some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(query),
  );
}

export function filterByDashboardControls(
  data: DashboardData,
  active: DashboardFilters,
): DashboardData {
  const query = active.query.trim().toLowerCase();
  const cutoff =
    active.range === "all" ? null : Date.now() - Number(active.range.replace("d", "")) * 86_400_000;

  const sprintCards =
    active.sprint === "all"
      ? data.cards
      : data.cards.filter((card) => card.sprint === active.sprint);
  const sprintIds = new Set(sprintCards.map((card) => card.id));

  const queryCardIds = query
    ? new Set(
        data.cards
          .filter((card) =>
            includesQuery(
              [card.work_item_id, card.name, card.owner, card.team, card.repository],
              query,
            ),
          )
          .map((card) => card.id),
      )
    : null;

  let cards = sprintCards;
  if (queryCardIds) cards = cards.filter((card) => queryCardIds.has(card.id));

  let events = data.events.filter((event) => sprintIds.has(event.card.id));
  if (cutoff !== null) events = events.filter((event) => Date.parse(event.occurred_at) >= cutoff);
  if (query) {
    events = events.filter(
      (event) =>
        queryCardIds?.has(event.card.id) ||
        includesQuery(
          [event.event_id, event.event_name, event.actor.full_name, event.card.name, event.summary],
          query,
        ),
    );
  }

  const cardIds = new Set(cards.map((card) => card.id));
  let evidences = data.evidences.filter((evidence) => cardIds.has(evidence.card_id));
  if (cutoff !== null)
    evidences = evidences.filter((evidence) => Date.parse(evidence.date) >= cutoff);

  return { ...data, cards, events, evidences, teams: computeTeamMetrics(cards) };
}
