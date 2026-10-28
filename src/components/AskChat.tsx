import { useEffect, useRef, useState } from "react";
import type { Formula } from "../types";
import {
  localAdvice,
  matchFormulas,
  readMemory,
  rememberProblem,
  type ChatTurn,
  type ProblemMemory,
} from "../lib/ask";
import { rankAskCandidates } from "../lib/search";
import type { Subject } from "../lib/subject";
import { FormulaCard } from "./FormulaCard";

type Favourites = {
  isFormulaSaved: (id: string) => boolean;
  toggleFormula: (id: string) => void;
};

type Props = {
  subject: Subject;
  formulas: Formula[];
  formulaById: Map<string, Formula>;
  favourites: Favourites;
};

type StepView = {
  text: string;
  formulaIds: string[];
};

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  steps: StepView[];
};

const EXAMPLES = [
  "I know the area of a circle and need the circumference",
  "I have two sides of a right triangle and need the third",
];

const MAX_STORED = 40;

function storageKey(subject: Subject): string {
  return `memento-ask:${subject}`;
}

function pickFormulas(ids: string[], lookup: Map<string, Formula>): Formula[] {
  return ids.flatMap((id) => {
    const formula = lookup.get(id);
    return formula ? [formula] : [];
  });
}

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function problemNote(memory: ProblemMemory | null): string {
  if (!memory) return "";
  return [memory.problem, ...memory.known, ...memory.need].filter(Boolean).join(" ");
}

function workingLine(memory: ProblemMemory): string {
  const parts: string[] = [];
  if (memory.problem) parts.push(memory.problem);
  if (memory.known.length > 0) parts.push(`have ${memory.known.join(", ")}`);
  if (memory.need.length > 0) parts.push(`still need ${memory.need.join(", ")}`);
  return parts.join(" · ");
}

function pinnedIds(messages: Message[], memory: ProblemMemory | null): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const add = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  for (const message of messages) {
    for (const step of message.steps) {
      for (const id of step.formulaIds) add(id);
    }
  }
  for (const item of memory?.done ?? []) add(item.id);
  return ids;
}

function turnContent(message: Message): string {
  if (message.role !== "assistant" || message.steps.length === 0) return message.text;
  const lines = [message.text];
  for (const step of message.steps) {
    const ids = step.formulaIds.length > 0 ? ` [${step.formulaIds.join(", ")}]` : "";
    lines.push(`- ${step.text}${ids}`);
  }
  return lines.join("\n");
}

function isStep(value: unknown, allowed: Set<string>): StepView | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { text?: unknown; formulaIds?: unknown };
  if (typeof row.text !== "string" || !Array.isArray(row.formulaIds)) return null;
  const formulaIds = row.formulaIds.filter((id): id is string => typeof id === "string" && allowed.has(id));
  const text = row.text.trim();
  if (!text) return null;
  return { text, formulaIds };
}

function readMessage(value: unknown, allowed: Set<string>): Message | null {
  if (!value || typeof value !== "object") return null;
  const row = value as {
    id?: unknown;
    role?: unknown;
    text?: unknown;
    steps?: unknown;
    formulaIds?: unknown;
  };
  if ((row.role !== "user" && row.role !== "assistant") || typeof row.id !== "string") return null;
  if (typeof row.text !== "string") return null;

  let steps: StepView[] = [];
  if (Array.isArray(row.steps)) {
    steps = row.steps.flatMap((step) => {
      const parsed = isStep(step, allowed);
      return parsed ? [parsed] : [];
    });
  } else if (row.role === "assistant" && Array.isArray(row.formulaIds)) {
    const formulaIds = row.formulaIds.filter((id): id is string => typeof id === "string" && allowed.has(id));
    if (formulaIds.length > 0) steps = [{ text: row.text, formulaIds }];
  }

  return { id: row.id, role: row.role, text: row.text, steps };
}

function loadThread(
  subject: Subject,
  allowed: Set<string>,
): { messages: Message[]; memory: ProblemMemory | null } {
  try {
    const raw = sessionStorage.getItem(storageKey(subject));
    if (!raw) return { messages: [], memory: null };
    const parsed = JSON.parse(raw) as { messages?: unknown; memory?: unknown };
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages.flatMap((item) => {
          const message = readMessage(item, allowed);
          return message ? [message] : [];
        })
      : [];
    return {
      messages: messages.slice(-MAX_STORED),
      memory: readMemory(parsed.memory, allowed),
    };
  } catch {
    return { messages: [], memory: null };
  }
}

export function AskChat({ subject, formulas, formulaById, favourites }: Props) {
  const [thread] = useState(() => loadThread(subject, new Set(formulaById.keys())));
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>(thread.messages);
  const [memory, setMemory] = useState<ProblemMemory | null>(thread.memory);
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending]);

  useEffect(() => {
    try {
      const key = storageKey(subject);
      if (messages.length === 0 && !memory) {
        sessionStorage.removeItem(key);
        return;
      }
      sessionStorage.setItem(
        key,
        JSON.stringify({ messages: messages.slice(-MAX_STORED), memory }),
      );
    } catch {
      return;
    }
  }, [memory, messages, subject]);

  function clearProblem() {
    abortRef.current?.abort();
    abortRef.current = null;
    requestRef.current += 1;
    setPending(false);
    setMessages([]);
    setMemory(null);
    setDraft("");
  }

  async function send(text: string) {
    const query = text.trim();
    if (!query || pending) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const request = requestRef.current + 1;
    requestRef.current = request;

    const userMessage: Message = { id: nextId(), role: "user", text: query, steps: [] };
    const thread = [...messages, userMessage];
    setMessages(thread);
    setDraft("");
    setPending(true);

    const prior = thread.slice(0, -1);
    const previousQuery = [...prior].reverse().find((message) => message.role === "user")?.text ?? "";
    const history: ChatTurn[] = prior.map((message) => ({
      role: message.role,
      content: turnContent(message),
    }));
    const candidates = rankAskCandidates(formulas, {
      query,
      previousQuery,
      problemNote: problemNote(memory),
      pinnedIds: pinnedIds(prior, memory),
    });
    const fetched = await matchFormulas(query, candidates, history, memory, controller.signal);
    if (request !== requestRef.current) return;

    const advice = fetched ?? localAdvice(candidates, memory);
    const nextMemory = rememberProblem(advice.memory, memory);
    setMemory(nextMemory);
    setMessages([
      ...thread,
      {
        id: nextId(),
        role: "assistant",
        text: advice.reply,
        steps: advice.steps.map((step) => ({ text: step.text, formulaIds: step.ids })),
      },
    ]);
    setPending(false);
  }

  const note = memory ? workingLine(memory) : "";
  const canClear = messages.length > 0 || memory !== null;

  return (
    <div className="chat">
      {note ? (
        <p className="working-on">
          <span className="working-on-label">Working on</span>
          {note}
        </p>
      ) : null}

      {messages.length === 0 && !pending ? (
        <div className="chat-welcome">
          <p className="empty">
            Describe the problem. I will walk through the formulas in order, and remember the steps if you need more
            than one.
          </p>
          <div className="chat-examples">
            {EXAMPLES.map((example) => (
              <button key={example} type="button" onClick={() => void send(example)}>
                {example}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="chat-log" aria-live="polite">
          {messages.map((message) => (
            <div key={message.id} className={`chat-turn ${message.role}`}>
              {message.text ? <p className={`bubble ${message.role}`}>{message.text}</p> : null}
              {message.steps.length > 0 ? (
                <ol className="chat-steps">
                  {message.steps.map((step, index) => (
                    <li key={`${message.id}-${index}`} className="chat-step">
                      <p className="chat-step-label">Step {index + 1}</p>
                      <p className="chat-step-text">{step.text}</p>
                      {step.formulaIds.length > 0 ? (
                        <div className="chat-cards">
                          {pickFormulas(step.formulaIds, formulaById).map((formula) => (
                            <FormulaCard
                              key={formula.id}
                              formula={formula}
                              saved={favourites.isFormulaSaved(formula.id)}
                              onToggleSaved={() => favourites.toggleFormula(formula.id)}
                            />
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          ))}
          {pending ? <p className="bubble assistant picking-bubble">Thinking through the steps…</p> : null}
          <div ref={endRef} className="chat-end" />
        </div>
      )}

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <button type="button" className="composer-new" onClick={clearProblem} disabled={!canClear}>
          New problem
        </button>
        <div className="composer-row">
          <label className="composer-field">
            <span className="sr-only">Your problem</span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="I need to find…"
              autoCapitalize="sentences"
              autoComplete="off"
              enterKeyHint="send"
              disabled={pending}
            />
          </label>
          <button type="submit" disabled={pending || !draft.trim()}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
