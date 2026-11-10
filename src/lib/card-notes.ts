import { useEffect, useState } from "react";
import { CARD_NOTES_KEY } from "../data/notices";
import { pullCardNotes, pushCardNotes } from "./cloud";
import { clearedIds, DEVICE_CLEARED } from "./storage";

export const CARD_NOTES_SYNCED = "memento-card-notes-synced";
export const MAX_CARD_NOTE = 240;

export type CardNotes = Record<string, string>;

const empty: CardNotes = {};

function storageKey(accountId: string): string {
  return `${CARD_NOTES_KEY}:${accountId}`;
}

export function cleanCardNote(value: string): string {
  return value.replace(/\r\n/g, "\n").trim().slice(0, MAX_CARD_NOTE);
}

export function parseCardNotes(value: unknown): CardNotes {
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty;
  const notes: CardNotes = {};
  for (const [id, text] of Object.entries(value as Record<string, unknown>)) {
    if (typeof text !== "string") continue;
    const clean = cleanCardNote(text);
    if (!id || !clean) continue;
    notes[id] = clean;
  }
  return notes;
}

export function loadCardNotes(accountId: string | null): CardNotes {
  if (!accountId) return empty;
  try {
    const raw = localStorage.getItem(storageKey(accountId));
    if (!raw) return empty;
    return parseCardNotes(JSON.parse(raw) as unknown);
  } catch {
    return empty;
  }
}

function saveCardNotes(accountId: string, notes: CardNotes) {
  try {
    localStorage.setItem(storageKey(accountId), JSON.stringify(notes));
  } catch {
    // Quota or private mode — keep the note for this visit.
  }
}

function publish(accountId: string, notes: CardNotes) {
  saveCardNotes(accountId, notes);
  window.dispatchEvent(new CustomEvent(CARD_NOTES_SYNCED, { detail: accountId }));
  void pushCardNotes(accountId, notes);
}

export function replaceCardNotes(accountId: string, notes: CardNotes) {
  saveCardNotes(accountId, notes);
  window.dispatchEvent(new CustomEvent(CARD_NOTES_SYNCED, { detail: accountId }));
}

export function forgetCardNotes(accountId: string) {
  try {
    localStorage.removeItem(storageKey(accountId));
  } catch {
    // The account record is already gone.
  }
  window.dispatchEvent(new CustomEvent(CARD_NOTES_SYNCED, { detail: accountId }));
}

export function cardNoteCount(accountId: string | null): number {
  return Object.keys(loadCardNotes(accountId)).length;
}

export async function hydrateCardNotes(accountId: string) {
  const remote = await pullCardNotes(accountId);
  const local = loadCardNotes(accountId);
  if (remote === "offline") return;
  if (!remote) {
    if (Object.keys(local).length > 0) await pushCardNotes(accountId, local);
    return;
  }
  replaceCardNotes(accountId, remote);
}

function applyNote(notes: CardNotes, id: string, text: string): CardNotes {
  const clean = cleanCardNote(text);
  const next = { ...notes };
  if (!clean) delete next[id];
  else next[id] = clean;
  return next;
}

export function useCardNotes(accountId: string | null) {
  const [notes, setNotes] = useState(() => loadCardNotes(accountId));

  useEffect(() => {
    setNotes(loadCardNotes(accountId));
  }, [accountId]);

  useEffect(() => {
    const reload = (event: Event) => {
      if (!(event instanceof CustomEvent) || event.detail !== accountId) return;
      setNotes(loadCardNotes(accountId));
    };
    window.addEventListener(CARD_NOTES_SYNCED, reload);
    return () => window.removeEventListener(CARD_NOTES_SYNCED, reload);
  }, [accountId]);

  useEffect(() => {
    const onCleared = (event: Event) => {
      const ids = clearedIds(event);
      if (ids && !ids.includes("card-notes")) return;
      setNotes(loadCardNotes(accountId));
    };
    window.addEventListener(DEVICE_CLEARED, onCleared);
    return () => window.removeEventListener(DEVICE_CLEARED, onCleared);
  }, [accountId]);

  return {
    notes,
    noteFor: (id: string) => notes[id] ?? "",
    setNote: (id: string, text: string) => {
      if (!accountId) return;
      publish(accountId, applyNote(loadCardNotes(accountId), id, text));
    },
  };
}
