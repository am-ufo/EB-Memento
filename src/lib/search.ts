import type { Formula } from "../types";

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
