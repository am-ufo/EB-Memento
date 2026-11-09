import { AUTH_ATTEMPTS_KEY } from "../data/notices";

export const MIN_PASSWORD_LENGTH = 8;

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyui",
  "qwerty123",
  "qwertyuiop",
  "iloveyou",
  "letmein1",
  "admin123",
  "welcome1",
  "changeme",
  "abc12345",
  "passw0rd",
  "11111111",
  "00000000",
  "sunshine1",
  "princess",
  "football",
  "trustno1",
  "memento1",
]);

const MAX_FAILS = 5;
const PAUSE_MS = 30_000;

type AttemptRow = { fails: number; until: number };

function attemptEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function passwordTooEasy(password: string, email = ""): boolean {
  const lower = password.toLowerCase();
  if (!lower) return true;
  if (COMMON_PASSWORDS.has(lower)) return true;
  const trimmed = email.trim().toLowerCase();
  const local = trimmed.split("@")[0] ?? "";
  if (local.length >= 3 && (lower === local || lower === trimmed)) return true;
  return false;
}

export function passwordIssue(password: string, email = ""): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "Use at least 8 characters.";
  if (passwordTooEasy(password, email)) return "Choose a password that is harder to guess.";
  return null;
}

export function passwordsReady(password: string, confirm: string, email = ""): boolean {
  return passwordIssue(password, email) === null && password === confirm;
}

function readAttempts(): Record<string, AttemptRow> {
  try {
    const raw = sessionStorage.getItem(AUTH_ATTEMPTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const now = Date.now();
    const rows: Record<string, AttemptRow> = {};
    for (const [email, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object") continue;
      const row = value as Partial<AttemptRow>;
      if (typeof row.fails !== "number" || typeof row.until !== "number") continue;
      if (row.until > 0 && row.until <= now) continue;
      rows[email] = { fails: row.fails, until: row.until };
    }
    return rows;
  } catch {
    return {};
  }
}

function writeAttempts(rows: Record<string, AttemptRow>) {
  try {
    sessionStorage.setItem(AUTH_ATTEMPTS_KEY, JSON.stringify(rows));
  } catch {
    // Private mode keeps the pause for this render only.
  }
}

export function attemptPause(email: string): number {
  const row = readAttempts()[attemptEmail(email)];
  if (!row || row.until <= Date.now()) return 0;
  return row.until - Date.now();
}

export function noteFailedAttempt(email: string): number {
  const key = attemptEmail(email);
  const rows = readAttempts();
  const row = rows[key] ?? { fails: 0, until: 0 };
  if (row.until > Date.now()) return row.until - Date.now();
  const fails = row.fails + 1;
  if (fails >= MAX_FAILS) {
    rows[key] = { fails: 0, until: Date.now() + PAUSE_MS };
    writeAttempts(rows);
    return PAUSE_MS;
  }
  rows[key] = { fails, until: 0 };
  writeAttempts(rows);
  return 0;
}

export function clearAttempts(email: string) {
  const rows = readAttempts();
  delete rows[attemptEmail(email)];
  writeAttempts(rows);
}

export function pauseMessage(ms: number): string {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  return `Too many tries. Wait ${seconds} ${seconds === 1 ? "second" : "seconds"}.`;
}
