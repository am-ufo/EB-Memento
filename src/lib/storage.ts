import { ASK_KEYS, DEVICE, type DeviceId } from "../data/notices";
import type { Subject } from "./subject";

export const DEVICE_CLEARED = "memento-device-cleared";

export function askStorageKey(subject: Subject, accountId: string): string {
  return `${ASK_KEYS[subject]}:${accountId}`;
}

function storeFor(area: "local" | "session"): Storage {
  return area === "local" ? localStorage : sessionStorage;
}

function hasKey(area: "local" | "session", key: string): boolean {
  try {
    return storeFor(area).getItem(key) !== null;
  } catch {
    return false;
  }
}

function matchingKeys(area: "local" | "session", exact: readonly string[], prefix: string): string[] {
  const found = new Set<string>(exact);
  try {
    const store = storeFor(area);
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key && (key === prefix || key.startsWith(`${prefix}:`))) found.add(key);
    }
  } catch {
    // A blocked store just has the listed keys.
  }
  return [...found];
}

function keysStarting(area: "local" | "session", prefix: string): string[] {
  const found: string[] = [];
  try {
    const store = storeFor(area);
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key?.startsWith(prefix)) found.push(key);
    }
  } catch {
    // A blocked store has nothing extra to clear.
  }
  return found;
}

function keysFor(row: (typeof DEVICE)[number]): string[] {
  if (row.id === "favourites") return matchingKeys(row.area, row.keys, row.keys[0] ?? "memento:favourites");
  if (row.id === "ask") return matchingKeys(row.area, row.keys, "memento-ask");
  if (row.id === "profile") return [...row.keys, ...keysStarting("local", "sb-")];
  return [...row.keys];
}

export function hasDeviceData(): boolean {
  return DEVICE.some((row) => keysFor(row).some((key) => hasKey(row.area, key)));
}

export function hasAskThread(accountId: string | null): boolean {
  if (!accountId) return false;
  return (["maths", "physics"] as const).some((subject) => hasKey("session", askStorageKey(subject, accountId)));
}

export function clearDevice(ids?: readonly DeviceId[]) {
  const rows = ids ? DEVICE.filter((row) => ids.includes(row.id)) : DEVICE;
  for (const row of rows) {
    const store = storeFor(row.area);
    for (const key of keysFor(row)) {
      try {
        store.removeItem(key);
      } catch {
        // Private mode or a blocked store — nothing else to clear.
      }
    }
  }
  window.dispatchEvent(new CustomEvent<readonly DeviceId[]>(DEVICE_CLEARED, { detail: rows.map((row) => row.id) }));
}

export function clearedIds(event: Event): readonly string[] | null {
  if (!(event instanceof CustomEvent) || !Array.isArray(event.detail)) return null;
  return event.detail.filter((id): id is string => typeof id === "string");
}
