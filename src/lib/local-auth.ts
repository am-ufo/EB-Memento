import { ACCOUNTS_KEY } from "../data/notices";
import type { MathsPeriod, Profile, Year } from "./profile";

function storedUsername(value: string): string {
  const username = value.trim();
  return /^[A-Za-z][A-Za-z0-9_]{2,15}$/.test(username) ? username : "";
}

const LEGACY_ITERATIONS = 100_000;
const PASSWORD_ITERATIONS = 600_000;

export type LocalAccount = {
  id: string;
  email: string;
  salt: string;
  hash: string;
  iterations: number;
  name: string;
  username: string;
  profile: Profile | null;
};

type Store = {
  activeId: string | null;
  accounts: LocalAccount[];
};

const YEARS: Year[] = ["S4", "S5", "S6", "S7"];
const PERIODS: MathsPeriod[] = ["3", "4", "5", "6"];
const emptyStore: Store = { activeId: null, accounts: [] };

function readStore(): Store {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return emptyStore;
    const parsed = JSON.parse(raw) as { activeId?: unknown; accounts?: unknown };
    if (!Array.isArray(parsed.accounts)) return emptyStore;
    const accounts = parsed.accounts.flatMap((item) => {
      const account = readAccount(item);
      return account ? [account] : [];
    });
    const activeId =
      typeof parsed.activeId === "string" && accounts.some((account) => account.id === parsed.activeId)
        ? parsed.activeId
        : null;
    return { activeId, accounts };
  } catch {
    return emptyStore;
  }
}

function writeStore(store: Store) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(store));
  } catch {
    // Private mode keeps the account for this visit only if the write failed after we already returned it.
  }
}

function readAccount(value: unknown): LocalAccount | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<LocalAccount>;
  if (typeof row.id !== "string" || typeof row.email !== "string" || typeof row.salt !== "string" || typeof row.hash !== "string") {
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    salt: row.salt,
    hash: row.hash,
    iterations: readIterations(row.iterations),
    name: typeof row.name === "string" ? row.name : "",
    username: typeof row.username === "string" ? storedUsername(row.username) : "",
    profile: readProfile(row.profile),
  };
}

function readIterations(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return LEGACY_ITERATIONS;
  const count = Math.floor(value);
  if (count < LEGACY_ITERATIONS || count > 2_000_000) return LEGACY_ITERATIONS;
  return count;
}

function readProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<Profile>;
  if (!row.year || !YEARS.includes(row.year)) return null;
  if (!row.maths || !PERIODS.includes(row.maths)) return null;
  if (typeof row.advanced !== "boolean" || typeof row.physics !== "boolean") return null;
  return { year: row.year, maths: row.maths, advanced: row.advanced, physics: row.physics };
}

export function normalEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesFromHex(hexText: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hexText.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hexText.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function passwordHash(password: string, salt: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: bytesFromHex(salt), iterations, hash: "SHA-256" },
    key,
    256,
  );
  return hex(new Uint8Array(bits));
}

function hashesMatch(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    const leftCode = index < left.length ? left.charCodeAt(index) : 0;
    const rightCode = index < right.length ? right.charCodeAt(index) : 0;
    diff |= leftCode ^ rightCode;
  }
  return diff === 0;
}

export function isStoredAccount(id: string): boolean {
  return readStore().accounts.some((account) => account.id === id);
}

export function localSession(): LocalAccount | null {
  const store = readStore();
  if (!store.activeId) return null;
  return store.accounts.find((account) => account.id === store.activeId) ?? null;
}

export function findLocalEmail(email: string): LocalAccount | null {
  const clean = normalEmail(email);
  return readStore().accounts.find((account) => account.email === clean) ?? null;
}

export async function registerLocal(email: string, password: string): Promise<{ error: string | null; account: LocalAccount | null }> {
  const clean = normalEmail(email);
  const store = readStore();
  if (store.accounts.some((account) => account.email === clean)) {
    return { error: "That email already has an account. Sign in instead.", account: null };
  }
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const account: LocalAccount = {
    id: crypto.randomUUID(),
    email: clean,
    salt,
    hash: await passwordHash(password, salt, PASSWORD_ITERATIONS),
    iterations: PASSWORD_ITERATIONS,
    name: "",
    username: "",
    profile: null,
  };
  store.accounts.push(account);
  store.activeId = account.id;
  writeStore(store);
  return { error: null, account };
}

export async function matchLocal(email: string, password: string): Promise<LocalAccount | "wrong"> {
  const clean = normalEmail(email);
  const store = readStore();
  const account = store.accounts.find((item) => item.email === clean);
  const salt = account?.salt ?? hex(crypto.getRandomValues(new Uint8Array(16)));
  const iterations = account?.iterations ?? PASSWORD_ITERATIONS;
  const hash = await passwordHash(password, salt, iterations);
  if (!account || !hashesMatch(hash, account.hash)) return "wrong";
  if (account.iterations < PASSWORD_ITERATIONS) {
    account.salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    account.iterations = PASSWORD_ITERATIONS;
    account.hash = await passwordHash(password, account.salt, PASSWORD_ITERATIONS);
  }
  store.activeId = account.id;
  writeStore(store);
  return account;
}

export async function verifyLocalPassword(email: string, password: string): Promise<boolean> {
  const clean = normalEmail(email);
  const account = readStore().accounts.find((item) => item.email === clean);
  if (!account) return false;
  const hash = await passwordHash(password, account.salt, account.iterations);
  return hashesMatch(hash, account.hash);
}

export async function setLocalPassword(id: string, password: string): Promise<LocalAccount | null> {
  const store = readStore();
  const account = store.accounts.find((item) => item.id === id);
  if (!account) return null;
  account.salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  account.iterations = PASSWORD_ITERATIONS;
  account.hash = await passwordHash(password, account.salt, PASSWORD_ITERATIONS);
  store.activeId = account.id;
  writeStore(store);
  return account;
}

export function isUsernameTaken(username: string, exceptId: string | null): boolean {
  const clean = storedUsername(username);
  if (!clean) return false;
  const key = clean.toLowerCase();
  return readStore().accounts.some(
    (account) => account.username.toLowerCase() === key && account.id !== exceptId,
  );
}

export function saveLocalClass(
  id: string,
  name: string,
  username: string,
  profile: Profile,
): LocalAccount | "taken" | null {
  const clean = storedUsername(username);
  if (!clean) return null;
  const store = readStore();
  const account = store.accounts.find((item) => item.id === id);
  if (!account) return null;
  const key = clean.toLowerCase();
  if (store.accounts.some((item) => item.username.toLowerCase() === key && item.id !== id)) return "taken";
  account.name = name;
  account.username = clean;
  account.profile = profile;
  store.activeId = id;
  writeStore(store);
  return account;
}

export function signOutLocal() {
  const store = readStore();
  store.activeId = null;
  writeStore(store);
}

export function deleteLocal(id: string) {
  const store = readStore();
  store.accounts = store.accounts.filter((account) => account.id !== id);
  if (store.activeId === id) store.activeId = null;
  writeStore(store);
}
