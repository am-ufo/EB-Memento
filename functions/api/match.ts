type Candidate = {
  id: string;
  title: string;
  topic: string;
  aliases: string[];
  useWhen: string;
  katex: string;
  variables: { symbol: string; meaning: string }[];
};

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

type Step = {
  text: string;
  ids: string[];
};

type ProblemMemory = {
  problem: string;
  known: string[];
  need: string[];
  done: { id: string; found: string }[];
};

type MatchBody = {
  query?: unknown;
  messages?: unknown;
  candidates?: unknown;
  memory?: unknown;
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
const MAX_STEPS = 4;
const MAX_TURNS = 8;
const MAX_REPLY = 1200;
const MAX_STEP = 500;
const MAX_PROBLEM = 160;
const MAX_NOTE = 80;
const MAX_NOTES = 6;

const SYSTEM = [
  "You are Memento, a classmate helping with European Baccalaureate maths and physics.",
  "Walk one homework problem in order: which syllabus formula, why it fits, what each symbol is in this problem, and what to substitute.",
  "Do not compute the final number. Do not invent formulas, KaTeX, or IDs.",
  "Pick formula ids only from the candidate list. A rearrangement still counts (A = \\pi r^{2} also finds radius from area).",
  "One problem can need several formulas. Put them in steps, in the order to use them.",
  "Example: area of a circle, then circumference. Step 1 id circle-area (A is the area they have, r is the radius to find). Step 2 id circle-circumference (that radius goes in for r).",
  "Follow-ups stay on the same problem. Update memory each turn. If the new message is clearly a different problem, replace memory.",
  "If a quantity is missing, ask for that one detail and use empty ids.",
  'Reply with JSON only: {"reply":"one or two sentences on the whole method","steps":[{"text":"why this formula, which symbol is which quantity, what to substitute","ids":["circle-area"]}],"memory":{"problem":"circumference from the area of a circle","known":["area"],"need":["circumference"],"done":[{"id":"circle-area","found":"radius"}]},"ids":["circle-area","circle-circumference"]}',
  "At most 4 steps. ids lists the same formula ids as steps, in order, at most 5.",
  "memory.problem is a short restatement. known and need are short phrases. done lists formulas already used and what they give, not a calculated value.",
  "If none of the candidates fit, say what extra detail you need and use empty steps and ids. Keep the current memory.",
].join(" ");

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function isVariable(value: unknown): value is { symbol: string; meaning: string } {
  if (!value || typeof value !== "object") return false;
  const row = value as { symbol?: unknown; meaning?: unknown };
  return typeof row.symbol === "string" && typeof row.meaning === "string";
}

function isCandidate(value: unknown): value is Candidate {
  if (!value || typeof value !== "object") return false;
  const row = value as Candidate;
  return (
    typeof row.id === "string" &&
    typeof row.title === "string" &&
    typeof row.topic === "string" &&
    typeof row.useWhen === "string" &&
    typeof row.katex === "string" &&
    Array.isArray(row.aliases) &&
    row.aliases.every((alias) => typeof alias === "string") &&
    Array.isArray(row.variables) &&
    row.variables.every(isVariable)
  );
}

function isTurn(value: unknown): value is ChatTurn {
  if (!value || typeof value !== "object") return false;
  const row = value as ChatTurn;
  return (row.role === "user" || row.role === "assistant") && typeof row.content === "string";
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

function echoedIds(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const done = (value as { done?: unknown }).done;
  if (!Array.isArray(done)) return [];
  return done.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const id = (item as { id?: unknown }).id;
    return typeof id === "string" ? [id] : [];
  });
}

function parseMemory(value: unknown, allowed: Set<string>): ProblemMemory | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { problem?: unknown; known?: unknown; need?: unknown; done?: unknown };
  if (typeof row.problem !== "string") return null;

  const done: ProblemMemory["done"] = [];
  const seen = new Set<string>();
  if (Array.isArray(row.done)) {
    for (const item of row.done) {
      if (!item || typeof item !== "object") continue;
      const entry = item as { id?: unknown; found?: unknown };
      if (typeof entry.id !== "string" || !allowed.has(entry.id) || seen.has(entry.id)) continue;
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

function parseIds(value: unknown, allowed: Set<string>, seen: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const id of value) {
    if (typeof id !== "string" || !allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (seen.size >= MAX_IDS) break;
  }
  return ids;
}

function parseSteps(value: unknown, allowed: Set<string>): Step[] {
  if (!Array.isArray(value)) return [];
  const steps: Step[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { text?: unknown; ids?: unknown };
    if (typeof row.text !== "string") continue;
    const text = clip(row.text, MAX_STEP);
    if (!text) continue;
    steps.push({ text, ids: parseIds(row.ids, allowed, seen) });
    if (steps.length >= MAX_STEPS || seen.size >= MAX_IDS) break;
  }
  return steps;
}

function readText(result: unknown): string {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return "";
  const row = result as { response?: unknown; choices?: Array<{ message?: { content?: unknown } }> };
  if (typeof row.response === "string") return row.response;
  const content = row.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

function parseAdvice(
  text: string,
  allowed: Set<string>,
  previous: ProblemMemory | null,
): { reply: string; ids: string[]; steps: Step[]; memory: ProblemMemory | null } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return { reply: "", ids: [], steps: [], memory: previous };
  }

  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as {
      reply?: unknown;
      ids?: unknown;
      steps?: unknown;
      memory?: unknown;
    };
    let reply = typeof parsed.reply === "string" ? clip(parsed.reply, MAX_REPLY) : "";
    let steps = parseSteps(parsed.steps, allowed);
    if (steps.length === 0) {
      const ids = parseIds(parsed.ids, allowed, new Set());
      if (ids.length > 0) {
        steps = [
          {
            text: reply || "Use this formula. Match each symbol to what you have, then substitute.",
            ids,
          },
        ];
        reply = "Here is the next part of the method. You do the arithmetic.";
      }
    }
    const ids = steps.flatMap((step) => step.ids);
    if (!reply && steps.length > 0) reply = "Here is the method, in order. You do the arithmetic.";
    return {
      reply,
      ids,
      steps,
      memory: parseMemory(parsed.memory, allowed) ?? previous,
    };
  } catch {
    return { reply: "", ids: [], steps: [], memory: previous };
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
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const memoryIds = new Set([...candidateIds, ...echoedIds(body.memory)]);
  const previous = parseMemory(body.memory, memoryIds);

  if (candidates.length === 0) {
    return json({
      reply: "I could not match that to a syllabus formula. Say what you already have, and what you need to find.",
      ids: [],
      steps: [],
      memory: previous,
    });
  }

  const prompt = [
    { role: "system", content: SYSTEM },
    { role: "system", content: `Candidate formulas:\n${JSON.stringify(candidates)}` },
  ];
  if (previous) {
    prompt.push({
      role: "system",
      content: `Problem note so far. Update it for this same problem, or replace it if the new message is a different problem:\n${JSON.stringify(previous)}`,
    });
  }

  try {
    const result = await context.env.AI.run(MODEL, {
      messages: [
        ...prompt,
        ...history.map((turn) => ({ role: turn.role, content: turn.content })),
        { role: "user", content: query },
      ],
      max_tokens: 900,
    });
    const advice = parseAdvice(readText(result), candidateIds, previous);
    return json(advice);
  } catch {
    return json({ error: "unavailable" }, 502);
  }
}
