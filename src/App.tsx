import { useMemo, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import type { Formula, Notation } from "./types";
import { AskChat } from "./components/AskChat";
import { FormulaCard } from "./components/FormulaCard";
import { NotationsTable } from "./components/NotationsTable";
import { SubjectPicker } from "./components/SubjectPicker";
import { ThemeToggle } from "./components/ThemeToggle";
import formulaCatalog from "./data/formulas.json" with { type: "json" };
import notationCatalog from "./data/notations.json" with { type: "json" };
import { useFavourites } from "./lib/favourites";
import { categoriesOf, searchFormulas, searchNotations, topicsOf } from "./lib/search";
import { formulasFor, notationsFor, searchPool, type Subject } from "./lib/subject";
import { useTheme } from "./lib/theme";

const formulas = formulaCatalog as Formula[];
const notations = notationCatalog as Notation[];

const formulaById = new Map(formulas.map((formula) => [formula.id, formula]));
const notationById = new Map(notations.map((notation) => [notation.id, notation]));

type Tab = "formulas" | "ask" | "notations" | "saved";

const TABS: Tab[] = ["formulas", "ask", "notations", "saved"];

function withTransition(update: () => void) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || typeof document.startViewTransition !== "function") {
    update();
    return;
  }
  try {
    document.startViewTransition(() => {
      flushSync(update);
    });
  } catch {
    update();
  }
}

function pickByIds<T>(ids: string[], lookup: Map<string, T>): T[] {
  return ids.flatMap((id) => {
    const item = lookup.get(id);
    return item ? [item] : [];
  });
}

export function App() {
  const [tab, setTab] = useState<Tab>("formulas");
  const [subject, setSubject] = useState<Subject | null>(null);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const favourites = useFavourites();
  const { theme, toggle: toggleTheme } = useTheme();

  const subjectFormulas = useMemo(() => (subject ? formulasFor(formulas, subject) : []), [subject]);
  const subjectNotations = useMemo(() => (subject ? notationsFor(notations, subject) : []), [subject]);
  const formulaSearchPool = useMemo(() => (subject ? searchPool(formulas, subject) : []), [subject]);
  const notationSearchPool = useMemo(() => (subject ? searchPool(notations, subject) : []), [subject]);

  const topics = useMemo(() => topicsOf(subjectFormulas), [subjectFormulas]);
  const categories = useMemo(() => categoriesOf(subjectNotations), [subjectNotations]);

  const formulaResults = useMemo(() => {
    const pool = query.trim() ? formulaSearchPool : subjectFormulas;
    const found = searchFormulas(pool, query);
    if (!topic || query.trim()) return found;
    return found.filter((formula) => formula.topic === topic);
  }, [formulaSearchPool, query, subjectFormulas, topic]);

  const notationResults = useMemo(() => {
    const pool = query.trim() ? notationSearchPool : subjectNotations;
    const found = searchNotations(pool, query);
    if (!category || query.trim()) return found;
    return found.filter((row) => row.category === category);
  }, [category, notationSearchPool, query, subjectNotations]);

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
  const showPicker = !subject && tab !== "saved";
  const subjectLabel = subject === "physics" ? "Physics" : "Maths";

  function selectTab(next: Tab) {
    if (next === tab) return;
    withTransition(() => setTab(next));
  }

  function pickSubject(next: Subject) {
    withTransition(() => {
      setSubject(next);
      setQuery("");
      setTopic(null);
      setCategory(null);
      setTab("formulas");
    });
  }

  function clearSubject() {
    withTransition(() => {
      setSubject(null);
      setQuery("");
      setTopic(null);
      setCategory(null);
      setTab("formulas");
    });
  }

  const tabIndex = TABS.indexOf(tab);

  return (
    <div className={tab === "ask" && subject ? "shell shell-ask" : "shell"}>
      <header className="top">
        <div className="top-copy">
          {subject ? (
            <button type="button" className="eyebrow" onClick={clearSubject}>
              EB · {subjectLabel}
            </button>
          ) : (
            <p className="eyebrow">EB · Maths & Physics</p>
          )}
          <h1>Memento</h1>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <div className="stage">
      {tab !== "ask" && !showPicker ? (
        <label className="search">
          <span className="sr-only">{searchLabel}</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder={searchPlaceholder}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>
      ) : null}

      {showPicker ? <SubjectPicker onPick={pickSubject} /> : null}

      {subject && tab === "formulas" ? (
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
                  saved={favourites.isFormulaSaved(formula.id)}
                  onToggleSaved={() => favourites.toggleFormula(formula.id)}
                />
              ))
            )}
          </section>
        </>
      ) : null}

      {subject && tab === "ask" ? (
        <AskChat
          key={subject}
          subject={subject}
          formulas={formulaSearchPool}
          formulaById={formulaById}
          favourites={favourites}
        />
      ) : null}

      {subject && tab === "notations" ? (
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
                    saved={favourites.isFormulaSaved(formula.id)}
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
      </div>

      <nav className="tabbar" style={{ "--tab": tabIndex } as CSSProperties} aria-label="Sections">
        <button
          type="button"
          className={tab === "formulas" ? "on" : undefined}
          aria-current={tab === "formulas" ? "page" : undefined}
          onClick={() => selectTab("formulas")}
        >
          Formulas
        </button>
        <button
          type="button"
          className={tab === "ask" ? "on" : undefined}
          aria-current={tab === "ask" ? "page" : undefined}
          onClick={() => selectTab("ask")}
        >
          Ask
        </button>
        <button
          type="button"
          className={tab === "notations" ? "on" : undefined}
          aria-current={tab === "notations" ? "page" : undefined}
          onClick={() => selectTab("notations")}
        >
          Notations
        </button>
        <button
          type="button"
          className={tab === "saved" ? "on" : undefined}
          aria-current={tab === "saved" ? "page" : undefined}
          onClick={() => selectTab("saved")}
        >
          Favourites
        </button>
      </nav>
    </div>
  );
}
