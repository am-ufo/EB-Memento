import type { Subject } from "./subject";

const HASH_TO_SUBJECT: Record<string, Subject> = {
  math: "maths",
  maths: "maths",
  physics: "physics",
};

export function subjectFromHash(hash: string): Subject | null {
  const key = hash.replace(/^#/, "").trim().toLowerCase();
  if (!key) return null;
  return HASH_TO_SUBJECT[key] ?? null;
}

/** Canonical fragment. `#maths` is accepted on the way in and written as `#math`. */
export function hashForSubject(subject: Subject | null): string {
  if (subject === "maths") return "#math";
  if (subject === "physics") return "#physics";
  return "";
}

export function homePath(): string {
  return `${window.location.pathname}${window.location.search}`;
}
