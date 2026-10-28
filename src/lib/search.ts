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
  "but",
  "else",
  "has",
  "have",
  "how",
  "i",
  "if",
  "in",
  "instead",
  "into",
  "is",
  "it",
  "its",
  "just",
  "know",
  "known",
  "me",
  "my",
  "need",
  "of",
  "on",
  "only",
  "or",
  "please",
  "so",
  "solve",
  "still",
  "that",
  "the",
  "then",
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
  katex: string;
  variables: { symbol: string; meaning: string }[];
};

export type AskRankInput = {
  query: string;
  previousQuery?: string;
  problemNote?: string;
  pinnedIds?: string[];
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

function formulaWords(value: string): string {
  const spelled = value
    .replace(/\^\{2\}/g, " squared ")
    .replace(/\^2(?![0-9])/g, " squared ")
    .replace(/\^\{3\}/g, " cubed ")
    .replace(/\^3(?![0-9])/g, " cubed ")
    .replace(/\\([a-zA-Z]+)/g, " $1 ")
    .replace(/[{}_^\\]/g, " ");
  return fold(spelled);
}

function wordSet(value: string): Set<string> {
  return new Set(formulaWords(value).split(/\s+/).filter((token) => token.length > 0));
}

function fieldHas(field: string, token: string): boolean {
  if (token.length >= 3) return field.includes(token);
  return new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(field);
}

function scoreFormula(formula: Formula, tokens: string[]): number {
  const title = fold(formula.title);
  const aliases = fold(formula.aliases.join(" "));
  const useWhen = fold(formula.useWhen);
  const meanings = fold(formula.variables.map((variable) => variable.meaning).join(" "));
  const symbols = new Set(formula.variables.flatMap((variable) => [...wordSet(variable.symbol)]));
  const equation = wordSet(formula.katex);
  const text = haystack(formula);

  let score = 0;
  for (const token of tokens) {
    if (fieldHas(title, token)) score += 4;
    else if (fieldHas(aliases, token)) score += 3;
    else if (fieldHas(useWhen, token)) score += 3;
    else if (fieldHas(meanings, token)) score += 2;
    else if (symbols.has(token) || equation.has(token)) score += 1;
    else if (fieldHas(text, token)) score += 1;
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

type ScoredFormula = { formula: Formula; score: number; index: number };

function scoreMatches(formulas: Formula[], query: string): Map<string, ScoredFormula> {
  const tokens = contentTokens(query);
  const matches = new Map<string, ScoredFormula>();
  if (tokens.length === 0) return matches;

  formulas.forEach((formula, index) => {
    const score = scoreFormula(formula, tokens);
    if (score > 0) matches.set(formula.id, { formula, score, index });
  });
  return matches;
}

export function rankFormulaCandidates(
  formulas: Formula[],
  query: string,
  limit = CANDIDATE_LIMIT,
): Formula[] {
  return [...scoreMatches(formulas, query).values()]
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((row) => row.formula);
}

export function rankAskCandidates(
  formulas: Formula[],
  input: AskRankInput,
  limit = CANDIDATE_LIMIT,
): Formula[] {
  const latest = scoreMatches(formulas, input.query);
  const previous = input.previousQuery?.trim() ?? "";
  const note = input.problemNote?.trim() ?? "";
  const context = [note, previous].filter(Boolean).join(" ");
  const blended = context
    ? scoreMatches(formulas, `${context} ${input.query}`)
    : new Map<string, ScoredFormula>();

  const merged = [...new Set([...latest.keys(), ...blended.keys()])].map((id) => {
    const fromLatest = latest.get(id);
    const fromBlend = blended.get(id);
    const row = (fromLatest ?? fromBlend)!;
    return {
      formula: row.formula,
      latestScore: fromLatest?.score ?? 0,
      score: Math.max(fromLatest?.score ?? 0, fromBlend?.score ?? 0),
      index: row.index,
    };
  });

  merged.sort((a, b) => b.latestScore - a.latestScore || b.score - a.score || a.index - b.index);

  const chosen = merged.slice(0, limit).map((row) => row.formula);
  const seen = new Set(chosen.map((formula) => formula.id));
  const pinned = new Set(input.pinnedIds ?? []);
  const byId = new Map(formulas.map((formula) => [formula.id, formula]));

  for (const id of input.pinnedIds ?? []) {
    if (seen.has(id)) continue;
    const formula = byId.get(id);
    if (!formula) continue;
    if (chosen.length >= limit && !dropWeakestUnpinned(chosen, pinned, seen)) break;
    chosen.push(formula);
    seen.add(id);
  }

  return chosen;
}

function dropWeakestUnpinned(chosen: Formula[], pinned: Set<string>, seen: Set<string>): boolean {
  for (let index = chosen.length - 1; index >= 0; index -= 1) {
    if (pinned.has(chosen[index].id)) continue;
    seen.delete(chosen[index].id);
    chosen.splice(index, 1);
    return true;
  }
  return false;
}

export function toMatchCandidate(formula: Formula): MatchCandidate {
  return {
    id: formula.id,
    title: formula.title,
    topic: formula.topic,
    aliases: formula.aliases,
    useWhen: formula.useWhen,
    katex: formula.katex,
    variables: formula.variables.map((variable) => ({
      symbol: variable.symbol,
      meaning: variable.meaning,
    })),
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
