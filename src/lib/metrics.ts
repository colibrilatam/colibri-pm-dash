import type { PMCard, TrelloNormalizedEventV2 } from "./types";

export interface FlowMetric {
  name: string;
  lead: number | null;
  cycle: number | null;
  samples: number;
  reopenings: number;
  evidenceCompliance: number | null;
}

function daysBetween(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null;
  return (endMs - startMs) / 86_400_000;
}

function average(values: number[]): number | null {
  return values.length
    ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
    : null;
}

function firstStartedAt(card: PMCard, events: TrelloNormalizedEventV2[]): string | undefined {
  return events
    .filter((event) => event.card.id === card.id && event.category === "transition")
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
    .find((event) => {
      const after = event.field_change.items[0]?.after.display.toLowerCase() ?? "";
      return (
        after.includes("en curso") || after.includes("en proceso") || after.includes("in progress")
      );
    })?.occurred_at;
}

export function computeFlowMetrics(
  cards: PMCard[],
  events: TrelloNormalizedEventV2[],
): FlowMetric[] {
  const teams = Array.from(new Set(cards.map((card) => card.team))).sort((a, b) =>
    a.localeCompare(b),
  );
  return teams.map((team) => {
    const list = cards.filter((card) => card.team === team);
    const done = list.filter((card) => card.status === "Done");
    const leadValues = done
      .map((card) => daysBetween(card.created_at, card.completed_at))
      .filter((value): value is number => value !== null);
    const cycleValues = done
      .map((card) => daysBetween(firstStartedAt(card, events), card.completed_at))
      .filter((value): value is number => value !== null);
    const evidenceCards = done.filter((card) => card.evidence_required === true);
    const evidenceCompliance = evidenceCards.length
      ? Math.round(
          (evidenceCards.filter((card) => card.has_evidence === true).length /
            evidenceCards.length) *
            100,
        )
      : null;

    return {
      name: team,
      lead: average(leadValues),
      cycle: average(cycleValues),
      samples: leadValues.length,
      reopenings: list.reduce((sum, card) => sum + (card.reopenings ?? 0), 0),
      evidenceCompliance,
    };
  });
}

export function computeActorActivity(events: TrelloNormalizedEventV2[]) {
  const counts = new Map<string, number>();
  events.forEach((event) => {
    const name = event.actor.full_name.trim() || "Sin actor";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return Array.from(counts, ([name, actividad]) => ({ name, actividad }))
    .sort((a, b) => b.actividad - a.actividad || a.name.localeCompare(b.name))
    .slice(0, 12);
}
