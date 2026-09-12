import type { Formula, Notation } from "../types";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "calculate",
  "can",
  "do",
  "find",
  "for",
  "from",
  "get",
  "given",
  "has",
  "have",
  "how",
  "i",
  "in",
  "into",
  "is",
  "it",
  "its",
  "know",
  "known",
  "me",
  "my",
  "need",
  "of",
  "on",
  "or",
  "please",
  "solve",
  "that",
  "the",
  "this",
  "to",
  "use",
  "using",
  "want",
  "we",
  "what",
  "when",
  "with",
  "you",
]);

export const CANDIDATE_LIMIT = 15;

export type MatchCandidate = {
  id: string;
  title: string;
  topic: string;
  aliases: string[];
  useWhen: string;
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function tokensOf(value: string): string[] {
  return fold(value)
    .split(/\s+/)
    .filter(Boolean);
}

export function contentTokens(query: string): string[] {
  return tokensOf(query).filter((token) => !STOPWORDS.has(token));
}

function haystack(formula: Formula): string {
  const parts = [
    formula.title,
    formula.topic,
    ...formula.courses,
    ...formula.courses.map((course) => course.replaceAll("-", " ")),
    ...formula.aliases,
    formula.useWhen,
    ...formula.variables.map((variable) => variable.meaning),
  ];
  return fold(parts.join(" "));
}

function scoreFormula(formula: Formula, tokens: string[]): number {
  const title = fold(formula.title);
  const aliases = fold(formula.aliases.join(" "));
  const useWhen = fold(formula.useWhen);
  const meanings = fold(formula.variables.map((variable) => variable.meaning).join(" "));
  const text = haystack(formula);

  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) score += 4;
    else if (aliases.includes(token)) score += 3;
    else if (useWhen.includes(token)) score += 3;
    else if (meanings.includes(token)) score += 2;
    else if (text.includes(token)) score += 1;
  }
  if (tokens.length > 1 && title.includes(tokens.join(" "))) score += 2;
  return score;
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

export function rankFormulaCandidates(
  formulas: Formula[],
  query: string,
  limit = CANDIDATE_LIMIT,
): Formula[] {
  const tokens = contentTokens(query);
  if (tokens.length === 0) return [];

  return formulas
    .map((formula) => ({ formula, score: scoreFormula(formula, tokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.formula);
}

export function toMatchCandidate(formula: Formula): MatchCandidate {
  return {
    id: formula.id,
    title: formula.title,
    topic: formula.topic,
    aliases: formula.aliases,
    useWhen: formula.useWhen,
  };
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
