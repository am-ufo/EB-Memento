import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import type { Formula, Notation } from "./types";
import { AskChat } from "./components/AskChat";
import { ClassGate, NewPassword, SignIn } from "./components/SignIn";
import { FormulaCard } from "./components/FormulaCard";
import { SettingsIcon } from "./components/icons/SettingsIcon";
import { NotationsTable } from "./components/NotationsTable";
import { SettingsScreen } from "./components/SettingsScreen";
import { SubjectPicker } from "./components/SubjectPicker";
import { ThemeToggle } from "./components/ThemeToggle";
import formulaCatalog from "./data/formulas.json" with { type: "json" };
import notationCatalog from "./data/notations.json" with { type: "json" };
import { useAccount } from "./lib/account";
import { useFavourites } from "./lib/favourites";
import { forProfile } from "./lib/profile";
import { backOne, closeToApp, PAGE_TITLE, pageFromPath, pushPage, showSettingsFromNotice, type Page } from "./lib/pages";
import { categoriesOf, searchFormulas, searchNotations, topicsOf } from "./lib/search";
import { hashForSubject, homePath, subjectFromHash } from "./lib/route";
import { formulasFor, notationsFor, searchPool, type Subject } from "./lib/subject";
import { useTextSize } from "./lib/text-size";
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
  const [page, setPage] = useState<Page | null>(() => pageFromPath(window.location.pathname));
  const [subject, setSubject] = useState<Subject | null>(() => subjectFromHash(window.location.hash));
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const { phase, account, email, remote, signIn, signUp, sendReset, saveClass, signOut, deleteAccount, finishRecovery } =
    useAccount();
  const favourites = useFavourites(account?.id ?? null);
  const profile = account;
  const { theme, preference, setPreference, toggle: toggleTheme } = useTheme();
  const { size: textSize, setSize: setTextSize } = useTextSize();
  const subjectRef = useRef(subject);
  subjectRef.current = subject;
  const pageRef = useRef(page);
  pageRef.current = page;
  const paging = useRef(false);

  useEffect(() => {
    let canonicalizeTimer = 0;

    const canonicalize = () => {
      const canonical = hashForSubject(subjectFromHash(window.location.hash));
      if (window.location.hash === canonical) return;
      // The hash commits after hashchange, so rewrite aliases on the next turn.
      window.clearTimeout(canonicalizeTimer);
      canonicalizeTimer = window.setTimeout(() => {
        const settled = hashForSubject(subjectFromHash(window.location.hash));
        if (window.location.hash === settled) return;
        history.replaceState(null, "", settled ? `${homePath()}${settled}` : homePath());
      }, 0);
    };

    const onNavigate = () => {
      paging.current = false;
      canonicalize();
      const nextSubject = subjectFromHash(window.location.hash);
      const nextPage = pageFromPath(window.location.pathname);
      const subjectChanged = nextSubject !== subjectRef.current;
      const pageChanged = nextPage !== pageRef.current;
      if (!subjectChanged && !pageChanged) return;
      if (subjectChanged) subjectRef.current = nextSubject;
      if (pageChanged) pageRef.current = nextPage;
      withTransition(() => {
        if (subjectChanged) {
          setSubject(nextSubject);
          setQuery("");
          setTopic(null);
          setCategory(null);
          setTab("formulas");
        }
        if (pageChanged) setPage(nextPage);
      });
    };

    onNavigate();
    window.addEventListener("hashchange", onNavigate);
    window.addEventListener("popstate", onNavigate);
    return () => {
      window.clearTimeout(canonicalizeTimer);
      window.removeEventListener("hashchange", onNavigate);
      window.removeEventListener("popstate", onNavigate);
    };
  }, []);

  const catalogFormulas = useMemo(() => (profile ? forProfile(formulas, profile) : []), [profile]);
  const catalogNotations = useMemo(() => (profile ? forProfile(notations, profile) : []), [profile]);
  const subjectFormulas = useMemo(
    () => (subject ? formulasFor(catalogFormulas, subject) : []),
    [catalogFormulas, subject],
  );
  const subjectNotations = useMemo(
    () => (subject ? notationsFor(catalogNotations, subject) : []),
    [catalogNotations, subject],
  );
  const formulaSearchPool = useMemo(
    () => (subject ? searchPool(catalogFormulas, subject) : []),
    [catalogFormulas, subject],
  );
  const notationSearchPool = useMemo(
    () => (subject ? searchPool(catalogNotations, subject) : []),
    [catalogNotations, subject],
  );

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
  const waiting = phase.status !== "ready";
  const showPicker = Boolean(profile?.physics) && !subject && tab !== "saved";
  const subjectLabel = !profile || !subject ? "Maths & Physics" : subject === "physics" ? "Physics" : "Maths";
  const eyebrow = profile ? `${profile.name} · ${subjectLabel}` : `EB · ${subjectLabel}`;
  const shellClass = page || waiting ? "shell shell-page" : tab === "ask" && subject ? "shell shell-ask" : "shell";

  useEffect(() => {
    document.title = page ? `${PAGE_TITLE[page]} · EB Memento` : "EB Memento";
  }, [page]);

  const profileKey = profile ? `${profile.id}|${profile.year}|${profile.maths}|${profile.advanced}|${profile.physics}` : "";
  const seenProfile = useRef(profileKey);
  useEffect(() => {
    if (seenProfile.current === profileKey) return;
    const previousId = seenProfile.current.split("|")[0];
    const nextId = profileKey.split("|")[0];
    seenProfile.current = profileKey;
    setTopic(null);
    setCategory(null);
    setQuery("");
    if (previousId && nextId && previousId !== nextId) setTab("formulas");
  }, [profileKey]);

  useEffect(() => {
    if (profile || page) return;
    const hash = window.location.hash;
    if (hash.includes("access_token") || hash.includes("type=")) return;
    if (hash) history.replaceState(null, "", homePath());
    if (subject !== null) {
      setSubject(null);
      setTab("formulas");
    }
  }, [page, profile, subject]);

  useEffect(() => {
    if (!profile || profile.physics || page) return;
    if (subject === "maths" && window.location.hash === "#math") return;
    if (window.location.hash !== "#math") {
      history.replaceState(null, "", `${homePath()}#math`);
    }
    if (subject !== "maths") {
      setSubject("maths");
      setQuery("");
      setTopic(null);
      setCategory(null);
      setTab("formulas");
    }
  }, [page, profile, subject]);

  function openPage(next: Page) {
    if (paging.current || next === page) return;
    if (next === "settings" && page) {
      if (showSettingsFromNotice() === "back") {
        paging.current = true;
        window.setTimeout(() => {
          paging.current = false;
        }, 500);
        return;
      }
      window.scrollTo(0, 0);
      withTransition(() => setPage("settings"));
      return;
    }
    pushPage(next);
    window.scrollTo(0, 0);
    withTransition(() => setPage(next));
  }

  function backPage() {
    if (paging.current) return;
    if (backOne() === "back") {
      paging.current = true;
      window.setTimeout(() => {
        paging.current = false;
      }, 500);
      return;
    }
    window.scrollTo(0, 0);
    withTransition(() => setPage("settings"));
  }

  function closePage() {
    if (paging.current) return;
    if (closeToApp() === "back") {
      paging.current = true;
      window.setTimeout(() => {
        paging.current = false;
      }, 500);
      return;
    }
    window.scrollTo(0, 0);
    withTransition(() => setPage(null));
  }

  function onGear() {
    if (!page) {
      openPage("settings");
      return;
    }
    if (page === "settings") {
      closePage();
      return;
    }
    openPage("settings");
  }

  useEffect(() => {
    if (!page) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page]);

  function selectTab(next: Tab) {
    if (next === tab) return;
    withTransition(() => setTab(next));
  }

  const tabIndex = TABS.indexOf(tab);

  return (
    <div className={shellClass}>
      <header className="top">
        <div className="top-copy">
          {profile?.physics && subject && !page ? (
            <a className="eyebrow" href={homePath()} aria-label="All subjects">
              {eyebrow}
            </a>
          ) : (
            <p className="eyebrow">{eyebrow}</p>
          )}
          <h1>Memento</h1>
        </div>
        <div className="top-actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button
            type="button"
            className={page ? "icon-button on" : "icon-button"}
            aria-label={page === "settings" ? "Close settings" : "Settings"}
            aria-pressed={page === "settings"}
            onClick={onGear}
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      <div className="stage">
      {page ? (
        <SettingsScreen
          page={page}
          preference={preference}
          onPreference={setPreference}
          textSize={textSize}
          onTextSize={setTextSize}
          formulaCount={favourites.formulaIds.length}
          notationCount={favourites.notationIds.length}
          profile={profile}
          email={email}
          onSaveProfile={(next, name, username) => saveClass(name, username, next)}
          onSignOut={() => {
            void signOut();
            closePage();
          }}
          onDeleteAccount={async () => {
            const message = await deleteAccount();
            if (!message) closePage();
            return message;
          }}
          onClose={closePage}
          onBack={backPage}
          onOpen={openPage}
        />
      ) : phase.status === "loading" ? (
        <p className="empty">Opening your account…</p>
      ) : phase.status === "recovery" ? (
        <NewPassword onSave={finishRecovery} />
      ) : phase.status === "needs-class" ? (
        <ClassGate email={email} ownerId={phase.userId} onSave={saveClass} />
      ) : phase.status !== "ready" ? (
        <SignIn remote={remote} onSignIn={signIn} onSignUp={signUp} onReset={sendReset} />
      ) : tab !== "ask" && !showPicker ? (
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

      {page || waiting ? null : (
      <>
      {showPicker ? <SubjectPicker /> : null}

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
          key={`${subject}:${profile?.id ?? ""}`}
          subject={subject}
          accountId={profile?.id ?? ""}
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
      </>
      )}
      </div>

      {page || waiting ? null : (
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
      )}
    </div>
  );
}
