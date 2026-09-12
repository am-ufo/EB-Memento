import { useMemo, useState } from "react";
import type { Formula, Notation } from "./types";
import { AskChat } from "./components/AskChat";
import { FormulaCard } from "./components/FormulaCard";
import { NotationsTable } from "./components/NotationsTable";
import formulaCatalog from "./data/formulas.json" with { type: "json" };
import notationCatalog from "./data/notations.json" with { type: "json" };
import { useFavourites } from "./lib/favourites";
import { categoriesOf, searchFormulas, searchNotations, topicsOf } from "./lib/search";

const formulas = formulaCatalog as Formula[];
const notations = notationCatalog as Notation[];

const formulaById = new Map(formulas.map((formula) => [formula.id, formula]));
const notationById = new Map(notations.map((notation) => [notation.id, notation]));

type Tab = "formulas" | "ask" | "notations" | "saved";

function pickByIds<T>(ids: string[], lookup: Map<string, T>): T[] {
  return ids.flatMap((id) => {
    const item = lookup.get(id);
    return item ? [item] : [];
  });
}

export function App() {
  const [tab, setTab] = useState<Tab>("formulas");
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const favourites = useFavourites();

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

  const savedFormulas = useMemo(
    () => searchFormulas(pickByIds(favourites.formulaIds, formulaById), query),
    [favourites.formulaIds, query],
  );

  const savedNotations = useMemo(
    () => searchNotations(pickByIds(favourites.notationIds, notationById), query),
    [favourites.notationIds, query],
  );

  const searchLabel =
    tab === "formulas" ? "Search formulas" : tab === "notations" ? "Search notations" : "Search saved";
  const searchPlaceholder =
    tab === "formulas"
      ? "Formula, topic, word…"
      : tab === "notations"
        ? "Symbol name, word…"
        : "Saved formula or symbol…";

  const savedEmpty = savedFormulas.length === 0 && savedNotations.length === 0;
  const savedCatalogEmpty = favourites.formulaIds.length === 0 && favourites.notationIds.length === 0;

  return (
    <div className={tab === "ask" ? "shell shell-ask" : "shell"}>
      <header className="top">
        <p className="eyebrow">EB · Maths & Physics</p>
        <h1>Memento</h1>
      </header>

      {tab !== "ask" ? (
        <label className="search">
          <span className="sr-only">{searchLabel}</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpenId(null);
            }}
            placeholder={searchPlaceholder}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>
      ) : null}

      {tab === "formulas" ? (
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
                  saved={favourites.isFormulaSaved(formula.id)}
                  onToggle={() => setOpenId(openId === formula.id ? null : formula.id)}
                  onToggleSaved={() => favourites.toggleFormula(formula.id)}
                />
              ))
            )}
          </section>
        </>
      ) : null}

      {tab === "ask" ? (
        <AskChat formulas={formulas} formulaById={formulaById} favourites={favourites} />
      ) : null}

      {tab === "notations" ? (
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

          <NotationsTable
            notations={notationResults}
            isSaved={favourites.isNotationSaved}
            onToggleSaved={favourites.toggleNotation}
          />
        </>
      ) : null}

      {tab === "saved" ? (
        savedEmpty ? (
          <p className="empty">
            {savedCatalogEmpty
              ? "Star a formula or notation to keep it here."
              : "No match in saved items. Try another word."}
          </p>
        ) : (
          <>
            {savedFormulas.length > 0 ? (
              <section className="results" aria-label="Saved formulas">
                {savedFormulas.map((formula) => (
                  <FormulaCard
                    key={formula.id}
                    formula={formula}
                    selected={openId === formula.id}
                    saved={favourites.isFormulaSaved(formula.id)}
                    onToggle={() => setOpenId(openId === formula.id ? null : formula.id)}
                    onToggleSaved={() => favourites.toggleFormula(formula.id)}
                  />
                ))}
              </section>
            ) : null}
            {savedNotations.length > 0 ? (
              <section className="saved-notations" aria-label="Saved notations">
                <NotationsTable
                  notations={savedNotations}
                  isSaved={favourites.isNotationSaved}
                  onToggleSaved={favourites.toggleNotation}
                />
              </section>
            ) : null}
          </>
        )
      ) : null}

      <nav className="tabbar" aria-label="Sections">
        <button
          type="button"
          className={tab === "formulas" ? "on" : undefined}
          aria-current={tab === "formulas" ? "page" : undefined}
          onClick={() => setTab("formulas")}
        >
          Formulas
        </button>
        <button
          type="button"
          className={tab === "ask" ? "on" : undefined}
          aria-current={tab === "ask" ? "page" : undefined}
          onClick={() => setTab("ask")}
        >
          Ask
        </button>
        <button
          type="button"
          className={tab === "notations" ? "on" : undefined}
          aria-current={tab === "notations" ? "page" : undefined}
          onClick={() => setTab("notations")}
        >
          Notations
        </button>
        <button
          type="button"
          className={tab === "saved" ? "on" : undefined}
          aria-current={tab === "saved" ? "page" : undefined}
          onClick={() => setTab("saved")}
        >
          Saved
        </button>
      </nav>
    </div>
  );
}
