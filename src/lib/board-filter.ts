import { useMemo, useSyncExternalStore } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { dashboardQuery } from "./query";
import { computeTeamMetrics } from "./demo-data";
import type { DashboardData } from "./data-adapter";

export const ALL_BOARDS = "all";
const STORAGE_KEY = "colibri.board";

let selected = ALL_BOARDS;
const listeners = new Set<() => void>();

export function setSelectedBoard(board: string) {
  selected = board;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, board);
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSelectedBoard(): string {
  return useSyncExternalStore(
    subscribe,
    () => selected,
    () => ALL_BOARDS,
  );
}

export function hydrateSelectedBoard() {
  if (typeof window === "undefined") return;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v && v !== selected) setSelectedBoard(v);
  } catch {
    /* ignore */
  }
}

export const UNKNOWN_BOARD = "Sin tablero";

export function boardOf(card: { board?: string }): string {
  return card.board?.trim() || UNKNOWN_BOARD;
}

export function listBoards(data: DashboardData): string[] {
  const set = new Set<string>();
  (data.cards ?? []).forEach((c) => set.add(boardOf(c)));
  (data.events ?? []).forEach((e) => {
    const n = e.board?.name?.trim();
    if (n && n !== "—") set.add(n);
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function filterByBoard(data: DashboardData, board: string): DashboardData {
  if (board === ALL_BOARDS) return data;
  const cards = (data.cards ?? []).filter((c) => boardOf(c) === board);
  const ids = new Set(cards.map((c) => c.id));
  const events = (data.events ?? []).filter(
    (e) => (e.board?.name?.trim() || UNKNOWN_BOARD) === board || ids.has(e.card?.id ?? ""),
  );
  const evidences = (data.evidences ?? []).filter((ev) => ids.has(ev.card_id));
  return { ...data, cards, events, evidences, teams: computeTeamMetrics(cards) };
}

/** Datos del panel ya filtrados por el tablero seleccionado. */
export function useDashboard(): DashboardData {
  const { data } = useSuspenseQuery(dashboardQuery);
  const board = useSelectedBoard();
  return useMemo(() => filterByBoard(data, board), [data, board]);
}
