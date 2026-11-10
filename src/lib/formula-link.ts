import { hashForSubject } from "./route";
import { isMaths, isPhysics, type Subject } from "./subject";

export function formulaIdFromPath(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const match = /^\/f\/([^/]+)$/.exec(path);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function formulaPath(id: string): string {
  return `/f/${encodeURIComponent(id)}`;
}

/** Subject a shared formula should open. Null leaves the sheet on its current subject. */
export function subjectForFormula(formula: { courses: string[] }): Subject | null {
  const physics = isPhysics(formula);
  const maths = isMaths(formula);
  if (physics && !maths) return "physics";
  if (maths) return "maths";
  return null;
}

export function formulaHref(id: string, subject: Subject | null): string {
  return `${formulaPath(id)}${hashForSubject(subject)}`;
}
