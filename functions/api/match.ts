type Candidate = {
  id: string;
  title: string;
  topic: string;
  aliases: string[];
  useWhen: string;
};

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

type MatchBody = {
  query?: unknown;
  messages?: unknown;
  candidates?: unknown;
};

type PagesContext = {
  request: Request;
  env: {
    AI: {
      run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
    };
  };
};

const MODEL = "@cf/zai-org/glm-4.7-flash";
const MAX_IDS = 5;
const MAX_TURNS = 8;

const SYSTEM = [
  "You are Memento, a tutor for European Baccalaureate maths and physics.",
  "The student describes a homework problem. Tell them which syllabus formula to use and why, in 2-4 short sentences.",
  "Do not solve the whole problem. Do not invent formulas, KaTeX, or IDs.",
  "Pick only from the candidate list. A formula may still apply after rearrangement (for example A = \\pi r^{2} also finds radius from area).",
  "Reply with JSON only: {\"reply\":\"your advice\",\"ids\":[\"id-one\",\"id-two\"]} best match first, at most 5 IDs.",
  "If none of the candidates fit, say what extra detail you need and use {\"ids\":[]}.",
].join(" ");

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isCandidate(value: unknown): value is Candidate {
  if (!value || typeof value !== "object") return false;
  const row = value as Candidate;
  return (
    typeof row.id === "string" &&
    typeof row.title === "string" &&
    typeof row.topic === "string" &&
    typeof row.useWhen === "string" &&
    Array.isArray(row.aliases) &&
    row.aliases.every((alias) => typeof alias === "string")
  );
}

function isTurn(value: unknown): value is ChatTurn {
  if (!value || typeof value !== "object") return false;
  const row = value as ChatTurn;
  return (row.role === "user" || row.role === "assistant") && typeof row.content === "string";
}

function readText(result: unknown): string {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return "";
  const row = result as { response?: unknown; choices?: Array<{ message?: { content?: unknown } }> };
  if (typeof row.response === "string") return row.response;
  const content = row.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

function parseAdvice(text: string, allowed: Set<string>): { reply: string; ids: string[] } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return { reply: "", ids: [] };

  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { reply?: unknown; ids?: unknown };
    const reply = typeof parsed.reply === "string" ? parsed.reply.trim().slice(0, 800) : "";
    const seen = new Set<string>();
    const ids: string[] = [];
    if (Array.isArray(parsed.ids)) {
      for (const id of parsed.ids) {
        if (typeof id !== "string" || !allowed.has(id) || seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
        if (ids.length >= MAX_IDS) break;
      }
    }
    return { reply, ids };
  } catch {
    return { reply: "", ids: [] };
  }
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  let body: MatchBody;
  try {
    body = (await context.request.json()) as MatchBody;
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query || !Array.isArray(body.candidates)) {
    return json({ error: "bad_request" }, 400);
  }

  const candidates = body.candidates.filter(isCandidate).slice(0, 15);
  const history = Array.isArray(body.messages) ? body.messages.filter(isTurn).slice(-MAX_TURNS) : [];
  const allowed = new Set(candidates.map((candidate) => candidate.id));

  if (candidates.length === 0) {
    return json({
      reply: "I could not match that to a syllabus formula. Say what you already have, and what you need to find.",
      ids: [],
    });
  }

  try {
    const result = await context.env.AI.run(MODEL, {
      messages: [
        { role: "system", content: SYSTEM },
        { role: "system", content: `Candidate formulas:\n${JSON.stringify(candidates)}` },
        ...history.map((turn) => ({ role: turn.role, content: turn.content })),
        { role: "user", content: query },
      ],
      max_tokens: 450,
    });
    const advice = parseAdvice(readText(result), allowed);
    return json({
      reply: advice.reply,
      ids: advice.ids,
    });
  } catch {
    return json({ error: "unavailable" }, 502);
  }
}
