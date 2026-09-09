import type { Formula, Notation } from "../types";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function haystack(formula: Formula): string {
  const parts = [
    formula.title,
    formula.topic,
    ...formula.courses,
    ...formula.courses.map((course) => course.replaceAll("-", " ")),
    ...formula.aliases,
    ...formula.variables.map((variable) => variable.meaning),
  ];
  return fold(parts.join(" "));
}

export function searchFormulas(formulas: Formula[], query: string): Formula[] {
  const q = fold(query.trim());
  if (!q) return formulas;

  const tokens = q.split(/\s+/).filter(Boolean);

  return formulas
    .map((formula) => {
      const text = haystack(formula);
      const titleHit = fold(formula.title).includes(q);
      const allTokens = tokens.every((token) => text.includes(token));
      if (!allTokens) return null;
      return { formula, rank: titleHit ? 0 : 1 };
    })
    .filter((row): row is { formula: Formula; rank: number } => row !== null)
    .sort((a, b) => a.rank - b.rank)
    .map((row) => row.formula);
}

export function topicsOf(formulas: Formula[]): string[] {
  return [...new Set(formulas.map((formula) => formula.topic))];
}

function notationHaystack(notation: Notation): string {
  return fold(
    [
      notation.name,
      notation.meaning,
      notation.category,
      ...notation.courses,
      ...notation.courses.map((course) => course.replaceAll("-", " ")),
      ...notation.aliases,
    ].join(" "),
  );
}

export function searchNotations(notations: Notation[], query: string): Notation[] {
  const q = fold(query.trim());
  if (!q) return notations;

  const tokens = q.split(/\s+/).filter(Boolean);

  return notations
    .map((notation) => {
      const text = notationHaystack(notation);
      const nameHit = fold(notation.name).includes(q);
      const allTokens = tokens.every((token) => text.includes(token));
      if (!allTokens) return null;
      return { notation, rank: nameHit ? 0 : 1 };
    })
    .filter((row): row is { notation: Notation; rank: number } => row !== null)
    .sort((a, b) => a.rank - b.rank)
    .map((row) => row.notation);
}

export function categoriesOf(notations: Notation[]): string[] {
  return [...new Set(notations.map((notation) => notation.category))];
}
