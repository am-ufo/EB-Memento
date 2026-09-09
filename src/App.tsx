import { useMemo, useState } from "react";
import type { Formula, Notation } from "./types";
import { FormulaCard } from "./components/FormulaCard";
import { NotationsTable } from "./components/NotationsTable";
import formulaCatalog from "./data/formulas.json" with { type: "json" };
import notationCatalog from "./data/notations.json" with { type: "json" };
import { categoriesOf, searchFormulas, searchNotations, topicsOf } from "./lib/search";

const formulas = formulaCatalog as Formula[];
const notations = notationCatalog as Notation[];

type Tab = "formulas" | "notations";

export function App() {
  const [tab, setTab] = useState<Tab>("formulas");
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const topics = useMemo(() => topicsOf(formulas), []);
  const categories = useMemo(() => categoriesOf(notations), []);

  const formulaResults = useMemo(() => {
    const found = searchFormulas(formulas, query);
    if (!topic || query.trim()) return found;
    return found.filter((formula) => formula.topic === topic);
  }, [query, topic]);

  const notationResults = useMemo(() => {
    const found = searchNotations(notations, query);
    if (!category) return found;
    return found.filter((row) => row.category === category);
  }, [query, category]);

  const searchingFormulas = tab === "formulas";

  return (
    <div className="shell">
      <header className="top">
        <p className="eyebrow">EB · S5 Maths 6P</p>
        <h1>Memento</h1>
      </header>

      <label className="search">
        <span className="sr-only">{searchingFormulas ? "Search formulas" : "Search notations"}</span>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpenId(null);
          }}
          placeholder={searchingFormulas ? "Formula, topic, word…" : "Symbol name, word…"}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>

      {searchingFormulas ? (
        <>
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
            {formulaResults.length === 0 ? (
              <p className="empty">No match. Try another word, or a topic.</p>
            ) : (
              formulaResults.map((formula) => (
                <FormulaCard
                  key={formula.id}
                  formula={formula}
                  selected={openId === formula.id}
                  onToggle={() => setOpenId(openId === formula.id ? null : formula.id)}
                />
              ))
            )}
          </section>
        </>
      ) : (
        <>
          <nav className="topics" aria-label="Categories">
            <button
              type="button"
              className={!category ? "on" : undefined}
              onClick={() => setCategory(null)}
            >
              All
            </button>
            {categories.map((name) => (
              <button
                key={name}
                type="button"
                className={category === name ? "on" : undefined}
                onClick={() => setCategory(name === category ? null : name)}
              >
                {name}
              </button>
            ))}
          </nav>

          <NotationsTable notations={notationResults} />
        </>
      )}

      <nav className="tabbar" aria-label="Sections">
        <button
          type="button"
          className={searchingFormulas ? "on" : undefined}
          aria-current={searchingFormulas ? "page" : undefined}
          onClick={() => setTab("formulas")}
        >
          Formulas
        </button>
        <button
          type="button"
          className={!searchingFormulas ? "on" : undefined}
          aria-current={!searchingFormulas ? "page" : undefined}
          onClick={() => setTab("notations")}
        >
          Notations
        </button>
      </nav>
    </div>
  );
}
