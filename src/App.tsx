import { useMemo, useState } from "react";
import type { Formula } from "./types";
import { FormulaCard } from "./components/FormulaCard";
import catalog from "./data/formulas.json" with { type: "json" };
import { searchFormulas, topicsOf } from "./lib/search";

const formulas = catalog as Formula[];

export function App() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const topics = useMemo(() => topicsOf(formulas), []);
  const results = useMemo(() => {
    const found = searchFormulas(formulas, query);
    if (!topic || query.trim()) return found;
    return found.filter((formula) => formula.topic === topic);
  }, [query, topic]);

  return (
    <div className="shell">
      <header className="top">
        <p className="eyebrow">EB · S5 Maths 6P</p>
        <h1>Memento</h1>
      </header>

      <label className="search">
        <span className="sr-only">Search formulas</span>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpenId(null);
          }}
          placeholder="Formula, topic, word…"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>

      {!query.trim() ? (
        <nav className="topics" aria-label="Topics">
          <button type="button" className={!topic ? "on" : undefined} onClick={() => setTopic(null)}>
            All
          </button>
          {topics.map((name) => (
            <button
              key={name}
              type="button"
              className={topic === name ? "on" : undefined}
              onClick={() => setTopic(name === topic ? null : name)}
            >
              {name}
            </button>
          ))}
        </nav>
      ) : null}

      <section className="results">
        {results.length === 0 ? (
          <p className="empty">No match. Try another word, or a topic.</p>
        ) : (
          results.map((formula) => (
            <FormulaCard
              key={formula.id}
              formula={formula}
              selected={openId === formula.id}
              onToggle={() => setOpenId(openId === formula.id ? null : formula.id)}
            />
          ))
        )}
      </section>
    </div>
  );
}
