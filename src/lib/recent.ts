import { useCallback, useEffect, useState } from "react";
import { RECENT_KEY } from "../data/notices";
import { clearedIds, DEVICE_CLEARED } from "./storage";

const LIMIT = 5;

export function recentStorageKey(accountId: string): string {
  return `${RECENT_KEY}:${accountId}`;
}

function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function loadRecent(accountId: string | null): string[] {
  if (!accountId) return [];
  try {
    const raw = localStorage.getItem(recentStorageKey(accountId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isIdList(parsed)) return [];
    return parsed.slice(0, LIMIT);
  } catch {
    return [];
  }
}

function saveRecent(accountId: string, ids: string[]) {
  try {
    localStorage.setItem(recentStorageKey(accountId), JSON.stringify(ids));
  } catch {
    // Quota or private mode — keep the list for this visit.
  }
}

export function useRecent(accountId: string | null) {
  const [ids, setIds] = useState(() => loadRecent(accountId));

  useEffect(() => {
    setIds(loadRecent(accountId));
  }, [accountId]);

  useEffect(() => {
    const onCleared = (event: Event) => {
      const cleared = clearedIds(event);
      if (cleared && !cleared.includes("recent")) return;
      setIds(loadRecent(accountId));
    };
    window.addEventListener(DEVICE_CLEARED, onCleared);
    return () => window.removeEventListener(DEVICE_CLEARED, onCleared);
  }, [accountId]);

  const remember = useCallback(
    (id: string) => {
      setIds((current) => {
        const next = [id, ...current.filter((item) => item !== id)].slice(0, LIMIT);
        const same = next.length === current.length && next.every((item, index) => item === current[index]);
        if (same) return current;
        if (accountId) saveRecent(accountId, next);
        return next;
      });
    },
    [accountId],
  );

  return { ids, remember };
}
