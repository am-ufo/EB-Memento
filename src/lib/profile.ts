import { useEffect, useState } from "react";
import { ASK_KEYS, FAVOURITES_KEY, PROFILE_KEY, RECENT_KEY } from "../data/notices";
import { clearedIds, DEVICE_CLEARED } from "./storage";

export type Year = "S4" | "S5" | "S6" | "S7";
export type MathsPeriod = "3" | "4" | "5" | "6";

export type Profile = {
  year: Year;
  maths: MathsPeriod;
  advanced: boolean;
  physics: boolean;
};

export type Account = Profile & {
  id: string;
  name: string;
  username: string;
};

type SessionStore = {
  deviceId: string;
  guest: Profile | null;
  activeId: string | null;
  accounts: Account[];
  email: string | null;
};

const YEARS: readonly Year[] = ["S4", "S5", "S6", "S7"];

export function isUpper(year: Year): boolean {
  return year === "S6" || year === "S7";
}

export function mathsChoices(year: Year): { id: MathsPeriod; label: string }[] {
  if (isUpper(year)) {
    return [
      { id: "3", label: "3 period" },
      { id: "5", label: "5 period" },
    ];
  }
  return [
    { id: "4", label: "4 period" },
    { id: "6", label: "6 period" },
  ];
}

/** Years in the same cycle, up to the one they are in. S5 includes S4. S7 includes S6. */
function cycleYears(year: Year): Year[] {
  if (year === "S5") return ["S4", "S5"];
  if (year === "S7") return ["S6", "S7"];
  return [year];
}

export function courseTags(profile: Profile): string[] {
  const tags: string[] = [];
  for (const year of cycleYears(profile.year)) {
    if (year === "S4" || year === "S5") tags.push(`${year}-Maths-6P`);
    else tags.push(`${year}-Maths-5P`);
    if (profile.advanced && isUpper(year)) tags.push(`${year}-Maths-3P-Adv`);
    if (profile.physics) tags.push(`${year}-Physics`);
  }
  return tags;
}

/** True when the card belongs to the saved class. The sheet still shows every formula. */
export function onCourse(item: { courses: string[] }, profile: Profile): boolean {
  const tags = new Set(courseTags(profile));
  return item.courses.some((course) => tags.has(course));
}

export function profileLabel(profile: Profile): string {
  const parts = [profile.year, `Maths ${profile.maths} period`];
  if (profile.advanced && isUpper(profile.year)) parts.push("Advanced");
  if (profile.physics) parts.push("Physics");
  return parts.join(" · ");
}

/** Why a shorter maths course still marks the longer syllabus. */
export function coversNote(profile: Profile): string | null {
  if (!isUpper(profile.year) && profile.maths === "4") {
    return "4 period sits inside the 6 period syllabus, so 6 period formulas are marked as yours. The sheet still shows every formula.";
  }
  if (isUpper(profile.year) && profile.maths === "3") {
    return "3 period sits inside the 5 period syllabus, so 5 period formulas are marked as yours. The sheet still shows every formula.";
  }
  return null;
}

function isYear(value: unknown): value is Year {
  return typeof value === "string" && (YEARS as readonly string[]).includes(value);
}

function isMathsPeriod(value: unknown): value is MathsPeriod {
  return value === "3" || value === "4" || value === "5" || value === "6";
}

function normalize(value: Profile): Profile | null {
  const allowed = mathsChoices(value.year).some((choice) => choice.id === value.maths);
  if (!allowed) return null;
  return {
    year: value.year,
    maths: value.maths,
    advanced: isUpper(value.year) && value.advanced,
    physics: value.physics,
  };
}

function blankSession(deviceId: string): SessionStore {
  return { deviceId, guest: null, activeId: null, accounts: [], email: null };
}

export function cleanName(value: string): string | null {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 24) return null;
  if (!/^[\p{L}][\p{L}\p{M}'’.\- ]*$/u.test(name)) return null;
  return name;
}

/** Public handle. Capitals are kept. Matching ignores case, so one person owns both forms. */
export function cleanUsername(value: string): string | null {
  const username = value.trim();
  if (!/^[A-Za-z][A-Za-z0-9_]{2,15}$/.test(username)) return null;
  return username;
}

const SAMPLE_NAME = "Artem";

/** A handle shaped like the first name, with a short suffix so it is not a copy of the name. */
export function usernameExample(
  name: string,
  year?: Year | null,
): { placeholder: string; hintName: string; hintFold: string } {
  const suffix = year ? `_s${year.slice(1)}` : "_eb";
  const first = name.trim().split(/\s+/)[0] ?? "";
  let letters = first
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z]/g, "");
  if (letters.length < 2) letters = SAMPLE_NAME;
  letters = letters.slice(0, 16 - suffix.length);
  const placeholder = `${letters}${suffix}`;
  const hintFold = placeholder.toLowerCase();
  const hintName =
    placeholder === hintFold ? `${hintFold.charAt(0).toUpperCase()}${hintFold.slice(1)}` : placeholder;
  return { placeholder, hintName, hintFold };
}

export function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.slice(0, 2).map((part) => part[0] ?? "");
  return letters.join("").toLocaleUpperCase();
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readProfileFields(row: { year?: unknown; maths?: unknown; advanced?: unknown; physics?: unknown }): Profile | null {
  if (!isYear(row.year) || !isMathsPeriod(row.maths) || typeof row.physics !== "boolean") return null;
  return normalize({
    year: row.year,
    maths: row.maths,
    advanced: row.advanced === true,
    physics: row.physics,
  });
}

function readAccount(value: unknown): Account | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { id?: unknown; name?: unknown; username?: unknown; year?: unknown; maths?: unknown; advanced?: unknown; physics?: unknown };
  const profile = readProfileFields(row);
  if (!profile || typeof row.id !== "string" || !row.id) return null;
  const name = typeof row.name === "string" ? row.name.trim().replace(/\s+/g, " ").slice(0, 24) : "";
  const username = typeof row.username === "string" ? cleanUsername(row.username) ?? "" : "";
  return { id: row.id, name, username, ...profile };
}

function moveLegacyFavourites(accountId: string) {
  try {
    const legacy = localStorage.getItem(FAVOURITES_KEY);
    const nextKey = `${FAVOURITES_KEY}:${accountId}`;
    if (legacy && localStorage.getItem(nextKey) === null) localStorage.setItem(nextKey, legacy);
    if (legacy) localStorage.removeItem(FAVOURITES_KEY);
  } catch {
    // Keep the old stars if storage is blocked.
  }
}

function profileOf(account: Account): Profile {
  return { year: account.year, maths: account.maths, advanced: account.advanced, physics: account.physics };
}

function readGuest(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null;
  return readProfileFields(value as { year?: unknown; maths?: unknown; advanced?: unknown; physics?: unknown });
}

/** A class saved before sign-in, keyed by the device id so stars and notes stay with it. */
function guestAccountFrom(session: SessionStore): Account | null {
  if (!session.guest) return null;
  return { id: session.deviceId, name: "", username: "", ...session.guest };
}

function attachDevice(partial: {
  deviceId?: string;
  guest?: Profile | null;
  activeId: string | null;
  accounts: Account[];
  email: string | null;
}): SessionStore {
  if (partial.deviceId) {
    return {
      deviceId: partial.deviceId,
      guest: partial.guest ?? null,
      activeId: partial.activeId,
      accounts: partial.accounts,
      email: partial.email,
    };
  }
  if (!partial.email) {
    const classOnly = partial.accounts[0];
    if (classOnly) {
      const session: SessionStore = {
        deviceId: classOnly.id,
        guest: profileOf(classOnly),
        activeId: null,
        accounts: [],
        email: null,
      };
      writeSession(session);
      return session;
    }
  }
  const session: SessionStore = {
    deviceId: `device:${newId()}`,
    guest: partial.guest ?? null,
    activeId: partial.activeId,
    accounts: partial.accounts,
    email: partial.email,
  };
  writeSession(session);
  return session;
}

function readSession(): SessionStore {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      if (memorySession) return memorySession;
      return attachDevice({ activeId: null, accounts: [], email: null });
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      if (memorySession) return memorySession;
      return attachDevice({ activeId: null, accounts: [], email: null });
    }
    const row = parsed as {
      deviceId?: unknown;
      guest?: unknown;
      activeId?: unknown;
      accounts?: unknown;
      email?: unknown;
      year?: unknown;
      maths?: unknown;
      advanced?: unknown;
      physics?: unknown;
    };
    if (Array.isArray(row.accounts)) {
      const accounts = row.accounts.flatMap((item) => {
        const account = readAccount(item);
        return account ? [account] : [];
      });
      const activeId = typeof row.activeId === "string" && accounts.some((account) => account.id === row.activeId) ? row.activeId : null;
      const email = typeof row.email === "string" ? row.email : null;
      const deviceId = typeof row.deviceId === "string" && row.deviceId ? row.deviceId : undefined;
      return attachDevice({ deviceId, guest: readGuest(row.guest), activeId, accounts, email });
    }
    const legacy = readProfileFields(row);
    if (!legacy) return attachDevice({ activeId: null, accounts: [], email: null });
    const account: Account = { id: newId(), name: "", username: "", ...legacy };
    moveLegacyFavourites(account.id);
    return attachDevice({ activeId: null, accounts: [account], email: null });
  } catch {
    if (memorySession) return memorySession;
    const session = blankSession(`device:${newId()}`);
    memorySession = session;
    return session;
  }
}

let memorySession: SessionStore | null = null;

function writeSession(session: SessionStore) {
  memorySession = session;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(session));
  } catch {
    // Private mode — keep the sign-in for this visit.
  }
}

/** Stable id for stars, notes, and class before anyone signs in. */
export function deviceOwnerId(): string {
  return readSession().deviceId;
}

/** Class chosen on this device with no email. Null until they set a year and course. */
export function guestAccount(): Account | null {
  return guestAccountFrom(readSession());
}

export function saveGuestClass(profile: Profile): Profile | null {
  const stored = normalize(profile);
  if (!stored) return null;
  const session = readSession();
  writeSession({ ...session, guest: stored });
  return stored;
}

/** Last signed-in class kept on this phone, so the sheet can open offline. */
export function cachedAccount(): Account | null {
  const session = readSession();
  if (!session.activeId) return null;
  return session.accounts.find((item) => item.id === session.activeId) ?? null;
}

export function rememberDeviceAccount(account: Account, email: string) {
  const session = readSession();
  writeSession({
    ...session,
    activeId: account.id,
    accounts: [account],
    email: email.trim().toLowerCase(),
  });
}

/** Class form for this email. Another person's saved class is left alone, even when the first name matches. */
export function deviceDraftFor(email: string): Account | null {
  const session = readSession();
  const current = email.trim().toLowerCase();
  if (session.email && session.email !== current) return null;
  if (session.email === current) {
    const cached = session.accounts.find((item) => item.id === session.activeId) ?? session.accounts[0] ?? null;
    if (cached) return cached;
  }
  return guestAccountFrom(session);
}

/** Drop the signed-in cache. The device id and the class chosen before sign-in stay. */
export function releaseSignedInCache() {
  const session = readSession();
  writeSession({ ...session, activeId: null, accounts: [], email: null });
}

export function forgetDeviceAccount() {
  memorySession = null;
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Already gone.
  }
}

function removeAccountData(id: string) {
  try {
    localStorage.removeItem(`${FAVOURITES_KEY}:${id}`);
    localStorage.removeItem(`${RECENT_KEY}:${id}`);
    sessionStorage.removeItem(`${ASK_KEYS.maths}:${id}`);
    sessionStorage.removeItem(`${ASK_KEYS.physics}:${id}`);
  } catch {
    // The person is still removed from the sign-in list.
  }
}

export function useSession() {
  const [session, setSession] = useState<SessionStore>(readSession);
  const account = session.accounts.find((item) => item.id === session.activeId) ?? null;

  useEffect(() => {
    const onCleared = (event: Event) => {
      const ids = clearedIds(event);
      if (ids && !ids.includes("profile")) return;
      setSession(readSession());
    };
    window.addEventListener(DEVICE_CLEARED, onCleared);
    return () => window.removeEventListener(DEVICE_CLEARED, onCleared);
  }, []);

  function commit(next: SessionStore) {
    writeSession(next);
    setSession(next);
  }

  function signUp(name: string, profile: Profile) {
    const clean = cleanName(name);
    const stored = normalize(profile);
    if (!clean || !stored) return;
    const created: Account = { id: newId(), name: clean, username: "", ...stored };
    commit({ ...session, activeId: created.id, accounts: [...session.accounts, created], email: session.email });
  }

  function signIn(id: string) {
    if (!session.accounts.some((item) => item.id === id)) return;
    commit({ ...session, activeId: id });
  }

  function signOut() {
    commit({ ...session, activeId: null });
  }

  function updateActive(name: string, profile: Profile) {
    if (!account) return;
    const clean = cleanName(name);
    const stored = normalize(profile);
    if (!clean || !stored) return;
    commit({
      ...session,
      accounts: session.accounts.map((item) => (item.id === account.id ? { ...item, name: clean, ...stored } : item)),
    });
  }

  function remove(id: string) {
    removeAccountData(id);
    commit({
      ...session,
      activeId: session.activeId === id ? null : session.activeId,
      accounts: session.accounts.filter((item) => item.id !== id),
    });
  }

  return { account, accounts: session.accounts, signUp, signIn, signOut, updateActive, remove };
}
