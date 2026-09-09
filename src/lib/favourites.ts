import { useState } from "react";

const STORAGE_KEY = "memento:favourites";

export type FavouritesState = {
  formulas: string[];
  notations: string[];
};

const empty: FavouritesState = { formulas: [], notations: [] };

function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function loadFavourites(): FavouritesState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

function saveFavourites(state: FavouritesState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or private mode — keep in-memory state.
  }
}

function toggleId(ids: string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((item) => item !== id);
  return [id, ...ids];
}

export function useFavourites() {
  const [state, setState] = useState(loadFavourites);

  const persist = (next: FavouritesState) => {
    setState(next);
    saveFavourites(next);
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
