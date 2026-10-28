import type { Formula } from "../types";
import { contentTokens, toMatchCandidate } from "./search";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type AskStep = {
  text: string;
  ids: string[];
};

export type ProblemDone = {
  id: string;
  found: string;
};

export type ProblemMemory = {
  problem: string;
  known: string[];
  need: string[];
  done: ProblemDone[];
};

export type MatchAdvice = {
  reply: string;
  ids: string[];
  steps: AskStep[];
  memory: ProblemMemory | null;
};

const MAX_IDS = 5;
const MAX_STEPS = 4;
const MAX_REPLY = 1200;
const MAX_STEP = 500;
const MAX_PROBLEM = 160;
const MAX_NOTE = 80;
const MAX_NOTES = 6;

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function noteList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const notes: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const text = clip(item, MAX_NOTE);
    if (!text) continue;
    notes.push(text);
    if (notes.length >= MAX_NOTES) break;
  }
  return notes;
}

function takeIds(value: unknown, allowed: Set<string> | null, seen: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const id of value) {
    if (typeof id !== "string" || seen.has(id)) continue;
    if (allowed && !allowed.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (seen.size >= MAX_IDS) break;
  }
  return ids;
}

export function readMemory(value: unknown, allowed?: Set<string>): ProblemMemory | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { problem?: unknown; known?: unknown; need?: unknown; done?: unknown };
  if (typeof row.problem !== "string") return null;

  const done: ProblemDone[] = [];
  const seen = new Set<string>();
  if (Array.isArray(row.done)) {
    for (const item of row.done) {
      if (!item || typeof item !== "object") continue;
      const entry = item as { id?: unknown; found?: unknown };
      if (typeof entry.id !== "string" || seen.has(entry.id)) continue;
      if (allowed && !allowed.has(entry.id)) continue;
      if (typeof entry.found !== "string") continue;
      const found = clip(entry.found, MAX_NOTE);
      if (!found) continue;
      seen.add(entry.id);
      done.push({ id: entry.id, found });
      if (done.length >= MAX_NOTES) break;
    }
  }

  const memory = {
    problem: clip(row.problem, MAX_PROBLEM),
    known: noteList(row.known),
    need: noteList(row.need),
    done,
  };
  if (!memory.problem && memory.known.length === 0 && memory.need.length === 0 && memory.done.length === 0) {
    return null;
  }
  return memory;
}

function readSteps(value: unknown, allowed: Set<string>): AskStep[] {
  if (!Array.isArray(value)) return [];
  const steps: AskStep[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { text?: unknown; ids?: unknown };
    if (typeof row.text !== "string") continue;
    const text = clip(row.text, MAX_STEP);
    if (!text) continue;
    steps.push({ text, ids: takeIds(row.ids, allowed, seen) });
    if (steps.length >= MAX_STEPS || seen.size >= MAX_IDS) break;
  }
  return steps;
}

function sameProblem(next: string, previous: string): boolean {
  const left = new Set(contentTokens(next));
  const right = new Set(contentTokens(previous));
  if (left.size === 0 || right.size === 0) return true;
  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared += 1;
  }
  const smaller = Math.min(left.size, right.size);
  return shared >= Math.min(2, smaller) || shared / smaller >= 0.5;
}

export function rememberProblem(next: ProblemMemory | null, previous: ProblemMemory | null): ProblemMemory | null {
  if (!next) return previous;
  if (!previous || !sameProblem(next.problem, previous.problem)) return next;
  const seen = new Set(next.done.map((item) => item.id));
  const kept = previous.done.filter((item) => !seen.has(item.id));
  return {
    problem: next.problem || previous.problem,
    known: next.known.length > 0 ? next.known : previous.known,
    need: next.need,
    done: [...kept, ...next.done].slice(-MAX_NOTES),
  };
}

function plainSymbol(symbol: string): string | null {
  const text = symbol.replace(/\$/g, "").trim();
  if (!text || text.includes("\\")) return null;
  return text;
}

function localStep(formula: Formula): string {
  const meanings = formula.variables
    .filter((variable) => variable.meaning)
    .map((variable) => {
      const symbol = plainSymbol(variable.symbol);
      return symbol ? `${symbol} is ${variable.meaning}` : variable.meaning;
    })
    .join(", ");
  const mapping = meanings ? ` ${meanings}.` : "";
  return `${formula.title}. ${formula.useWhen}${mapping} Substitute what you have.`;
}

export function localAdvice(candidates: Formula[], memory: ProblemMemory | null = null): MatchAdvice {
  if (candidates.length === 0) {
    return {
      reply: "I could not match that to a syllabus formula. Say what you already have, and what you need to find.",
      ids: [],
      steps: [],
      memory,
    };
  }

  const top = candidates.slice(0, 3);
  const steps = top.map((formula) => ({ text: localStep(formula), ids: [formula.id] }));
  return {
    reply: "These are the closest syllabus formulas. Say what you already have if this is the wrong step.",
    ids: top.map((formula) => formula.id),
    steps,
    memory,
  };
}

function settleAdvice(
  reply: string,
  steps: AskStep[],
  ids: string[],
  memory: ProblemMemory | null,
): MatchAdvice | null {
  if (steps.length === 0 && ids.length > 0) {
    return {
      reply: "Here is the next part of the method. You do the arithmetic.",
      ids,
      steps: [
        {
          text: reply || "Use this formula. Match each symbol to what you have, then substitute.",
          ids,
        },
      ],
      memory,
    };
  }
  if (!reply && steps.length === 0) return null;
  return {
    reply: reply || "Here is the method, in order. You do the arithmetic.",
    ids: steps.flatMap((step) => step.ids),
    steps,
    memory,
  };
}

export async function matchFormulas(
  query: string,
  candidates: Formula[],
  messages: ChatTurn[],
  memory: ProblemMemory | null,
  signal?: AbortSignal,
): Promise<MatchAdvice | null> {
  try {
    const response = await fetch("/api/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query,
        messages,
        memory,
        candidates: candidates.map(toMatchCandidate),
      }),
      signal,
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      reply?: unknown;
      ids?: unknown;
      steps?: unknown;
      memory?: unknown;
    };
    const allowed = new Set(candidates.map((candidate) => candidate.id));
    for (const item of memory?.done ?? []) allowed.add(item.id);
    const reply = typeof data.reply === "string" ? clip(data.reply, MAX_REPLY) : "";
    const steps = readSteps(data.steps, new Set(candidates.map((candidate) => candidate.id)));
    const ids = steps.length > 0 ? steps.flatMap((step) => step.ids) : takeIds(data.ids, allowed, new Set());
    return settleAdvice(reply, steps, ids, readMemory(data.memory, allowed));
  } catch {
    return null;
  }
}
