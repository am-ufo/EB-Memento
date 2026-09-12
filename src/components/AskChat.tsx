import { useEffect, useRef, useState } from "react";
import type { Formula } from "../types";
import { localAdvice, matchFormulas, type ChatTurn } from "../lib/ask";
import { rankFormulaCandidates } from "../lib/search";
import { FormulaCard } from "./FormulaCard";

type Favourites = {
  isFormulaSaved: (id: string) => boolean;
  toggleFormula: (id: string) => void;
};

type Props = {
  formulas: Formula[];
  formulaById: Map<string, Formula>;
  favourites: Favourites;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  formulaIds: string[];
};

const EXAMPLES = [
  "I need to find the radius of a circle from its area",
  "I have two sides of a right triangle and need the third",
];

function pickFormulas(ids: string[], lookup: Map<string, Formula>): Formula[] {
  return ids.flatMap((id) => {
    const formula = lookup.get(id);
    return formula ? [formula] : [];
  });
}

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AskChat({ formulas, formulaById, favourites }: Props) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending]);

  async function send(text: string) {
    const query = text.trim();
    if (!query || pending) return;

    const userMessage: Message = { id: nextId(), role: "user", text: query, formulaIds: [] };
    const thread = [...messages, userMessage];
    setMessages(thread);
    setDraft("");
    setPending(true);
    setOpenId(null);

    const history: ChatTurn[] = thread.slice(0, -1).map((message) => ({
      role: message.role,
      content: message.text,
    }));
    const candidates = rankFormulaCandidates(formulas, query);
    const advice =
      (await matchFormulas(query, candidates, history)) ?? localAdvice(candidates);
    const reply =
      advice.reply ||
      (advice.ids.length > 0
        ? localAdvice(pickFormulas(advice.ids, formulaById)).reply
        : localAdvice(candidates).reply);

    setMessages([
      ...thread,
      {
        id: nextId(),
        role: "assistant",
        text: reply,
        formulaIds: advice.ids,
      },
    ]);
    setPending(false);
  }

  return (
    <div className="chat">
      {messages.length === 0 && !pending ? (
        <div className="chat-welcome">
          <p className="empty">Tell me the problem. I will point you to the syllabus formula to use.</p>
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
              <p className={`bubble ${message.role}`}>{message.text}</p>
              {message.formulaIds.length > 0 ? (
                <div className="chat-cards">
                  {pickFormulas(message.formulaIds, formulaById).map((formula) => (
                    <FormulaCard
                      key={formula.id}
                      formula={formula}
                      selected={openId === formula.id}
                      saved={favourites.isFormulaSaved(formula.id)}
                      onToggle={() => setOpenId(openId === formula.id ? null : formula.id)}
                      onToggleSaved={() => favourites.toggleFormula(formula.id)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {pending ? <p className="bubble assistant picking-bubble">Looking up formulas…</p> : null}
          <div ref={endRef} />
        </div>
      )}

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
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
      </form>
    </div>
  );
}
