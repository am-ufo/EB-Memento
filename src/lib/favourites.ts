import { useEffect, useState } from "react";
import { FAVOURITES_KEY } from "../data/notices";
import { pullFavourites, pushFavourites } from "./cloud";
import { clearedIds, DEVICE_CLEARED } from "./storage";

export const FAVOURITES_SYNCED = "memento-favourites-synced";

const STORAGE_KEY = FAVOURITES_KEY;

export type FavouritesState = {
  formulas: string[];
  notations: string[];
};

const empty: FavouritesState = { formulas: [], notations: [] };

function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function favouritesStorageKey(accountId: string): string {
  return `${STORAGE_KEY}:${accountId}`;
}

export function loadFavourites(accountId: string | null): FavouritesState {
  if (!accountId) return empty;
  try {
    const raw = localStorage.getItem(favouritesStorageKey(accountId));
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return empty;
    const record = parsed as Record<string, unknown>;
    return {
      formulas: isIdList(record.formulas) ? record.formulas : [],
      notations: isIdList(record.notations) ? record.notations : [],
    };
  } catch {
    return empty;
  }
}

function saveFavourites(accountId: string, state: FavouritesState) {
  try {
    localStorage.setItem(favouritesStorageKey(accountId), JSON.stringify(state));
  } catch {
    // Quota or private mode — keep in-memory state.
  }
}

export function replaceFavourites(accountId: string, state: FavouritesState) {
  saveFavourites(accountId, state);
  window.dispatchEvent(new CustomEvent(FAVOURITES_SYNCED, { detail: accountId }));
}

export function adoptStars(fromId: string, toId: string) {
  if (fromId === toId) return;
  const current = loadFavourites(toId);
  if (current.formulas.length > 0 || current.notations.length > 0) return;
  const previous = loadFavourites(fromId);
  if (previous.formulas.length === 0 && previous.notations.length === 0) return;
  replaceFavourites(toId, previous);
}

export async function hydrateFavourites(accountId: string) {
  const remote = await pullFavourites(accountId);
  const local = loadFavourites(accountId);
  if (remote === "offline") return;
  if (!remote) {
    if (local.formulas.length > 0 || local.notations.length > 0) {
      await pushFavourites(accountId, local.formulas, local.notations);
    }
    return;
  }
  replaceFavourites(accountId, remote);
}

function toggleId(ids: string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((item) => item !== id);
  return [id, ...ids];
}

export function useFavourites(accountId: string | null) {
  const [state, setState] = useState(() => loadFavourites(accountId));

  useEffect(() => {
    setState(loadFavourites(accountId));
  }, [accountId]);

  useEffect(() => {
    const onSynced = (event: Event) => {
      if (!(event instanceof CustomEvent) || event.detail !== accountId) return;
      setState(loadFavourites(accountId));
    };
    window.addEventListener(FAVOURITES_SYNCED, onSynced);
    return () => window.removeEventListener(FAVOURITES_SYNCED, onSynced);
  }, [accountId]);

  useEffect(() => {
    const onCleared = (event: Event) => {
      const ids = clearedIds(event);
      if (ids && !ids.includes("favourites")) return;
      setState(loadFavourites(accountId));
    };
    window.addEventListener(DEVICE_CLEARED, onCleared);
    return () => window.removeEventListener(DEVICE_CLEARED, onCleared);
  }, [accountId]);

  const persist = (next: FavouritesState) => {
    setState(next);
    if (!accountId) return;
    saveFavourites(accountId, next);
    void pushFavourites(accountId, next.formulas, next.notations);
  };

  return {
    formulaIds: state.formulas,
    notationIds: state.notations,
    isFormulaSaved: (id: string) => state.formulas.includes(id),
    isNotationSaved: (id: string) => state.notations.includes(id),
    toggleFormula: (id: string) => persist({ ...state, formulas: toggleId(state.formulas, id) }),
    toggleNotation: (id: string) => persist({ ...state, notations: toggleId(state.notations, id) }),
  };
}
