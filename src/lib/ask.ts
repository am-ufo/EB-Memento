import type { Formula } from "../types";
import { toMatchCandidate } from "./search";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type MatchAdvice = {
  reply: string;
  ids: string[];
};

export function localAdvice(candidates: Formula[]): MatchAdvice {
  if (candidates.length === 0) {
    return {
      reply: "I could not match that to a syllabus formula. Say what you already have, and what you need to find.",
      ids: [],
    };
  }

  const top = candidates.slice(0, 3);
  const first = top[0];
  const more = top.slice(1).map((formula) => formula.title);
  let reply = `Use ${first.title}. ${first.useWhen}`;
  if (more.length > 0) reply += ` Also look at ${more.join(" and ")}.`;
  return { reply, ids: top.map((formula) => formula.id) };
}

export async function matchFormulas(
  query: string,
  candidates: Formula[],
  messages: ChatTurn[],
  signal?: AbortSignal,
): Promise<MatchAdvice | null> {
  try {
    const response = await fetch("/api/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query,
        messages,
        candidates: candidates.map(toMatchCandidate),
      }),
      signal,
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { reply?: unknown; ids?: unknown };
    const allowed = new Set(candidates.map((candidate) => candidate.id));
    const ids = Array.isArray(data.ids)
      ? data.ids.filter((id): id is string => typeof id === "string" && allowed.has(id))
      : [];
    const reply = typeof data.reply === "string" ? data.reply.trim() : "";
    if (!reply && ids.length === 0) return null;
    return { reply, ids };
  } catch {
    return null;
  }
}
