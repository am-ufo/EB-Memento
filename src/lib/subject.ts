import type { Formula, Notation } from "../types";

export type Subject = "maths" | "physics";

type Tagged = { courses: string[] };

export function isMaths(item: Tagged): boolean {
  return item.courses.some((course) => course.includes("Maths"));
}

export function isPhysics(item: Tagged): boolean {
  return item.courses.some((course) => course.includes("Physics"));
}

export function formulasFor(formulas: Formula[], subject: Subject): Formula[] {
  return formulas.filter(subject === "maths" ? isMaths : isPhysics);
}

export function notationsFor(notations: Notation[], subject: Subject): Notation[] {
  return notations.filter(subject === "maths" ? isMaths : isPhysics);
}

export function searchPool<T extends Tagged>(items: T[], subject: Subject): T[] {
  if (subject === "maths") return items.filter(isMaths);
  return items.filter((item) => isPhysics(item) || isMaths(item));
}
