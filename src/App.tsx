import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type { Formula, Notation } from "./types";
import { AskChat } from "./components/AskChat";
import { NewPassword } from "./components/SignIn";
import { FormulaCard } from "./components/FormulaCard";
import { SettingsIcon } from "./components/icons/SettingsIcon";
import { NotationsTable } from "./components/NotationsTable";
import { SettingsScreen } from "./components/SettingsScreen";
import { SubjectPicker } from "./components/SubjectPicker";
import { ThemeToggle } from "./components/ThemeToggle";
import formulaCatalog from "./data/formulas.json" with { type: "json" };
import notationCatalog from "./data/notations.json" with { type: "json" };
import { useAccount } from "./lib/account";
import { useCardNotes } from "./lib/card-notes";
import { formulaHref, formulaIdFromPath, subjectForFormula } from "./lib/formula-link";
import { useFavourites } from "./lib/favourites";
import { onCourse } from "./lib/profile";
import { backOne, closeToApp, PAGE_TITLE, pageFromPath, pushPage, showSettingsFromNotice, type Page } from "./lib/pages";
import { useRecent } from "./lib/recent";
import { categoriesOf, searchFormulas, searchNotations, topicsOf } from "./lib/search";
import { hashForSubject, homePath, subjectFromHash } from "./lib/route";
import { formulasFor, isMaths, isPhysics, notationsFor, searchPool, type Subject } from "./lib/subject";
import { useTextSize } from "./lib/text-size";
import { useTheme } from "./lib/theme";

const formulas = formulaCatalog as Formula[];
const notations = notationCatalog as Notation[];

const formulaById = new Map(formulas.map((formula) => [formula.id, formula]));
const notationById = new Map(notations.map((notation) => [notation.id, notation]));

function initialSubject(): Subject | null {
  const fromHash = subjectFromHash(window.location.hash);
  if (fromHash) return fromHash;
  const id = formulaIdFromPath(window.location.pathname);
  const formula = id ? formulaById.get(id) : undefined;
  if (!formula) return null;
  if (isPhysics(formula) && !isMaths(formula)) return "physics";
  if (isMaths(formula)) return "maths";
  return null;
}

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
  const [subject, setSubject] = useState<Subject | null>(initialSubject);
  const [linkedId, setLinkedId] = useState<string | null>(() => formulaIdFromPath(window.location.pathname));
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const {
    phase,
    account,
    email,
    ownerId,
    remote,
    signIn,
    signUp,
    sendReset,
    saveClass,
    signOut,
    changePassword,
    deleteAccount,
    finishRecovery,
  } = useAccount();
  const favourites = useFavourites(ownerId);
  const cardNotes = useCardNotes(ownerId);
  const recent = useRecent(ownerId);
  const profile = account;
  const { theme, preference, setPreference, toggle: toggleTheme } = useTheme();
  const { size: textSize, setSize: setTextSize } = useTextSize();
  const subjectRef = useRef(subject);
  subjectRef.current = subject;
  const pageRef = useRef(page);
  pageRef.current = page;
  const linkedRef = useRef(linkedId);
  linkedRef.current = linkedId;
  const searchRef = useRef<HTMLInputElement>(null);
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
      const nextLinked = formulaIdFromPath(window.location.pathname);
      const subjectChanged = nextSubject !== subjectRef.current;
      const pageChanged = nextPage !== pageRef.current;
      const linkChanged = nextLinked !== linkedRef.current;
      if (!subjectChanged && !pageChanged && !linkChanged) return;
      if (subjectChanged) subjectRef.current = nextSubject;
      if (pageChanged) pageRef.current = nextPage;
      if (linkChanged) linkedRef.current = nextLinked;
      withTransition(() => {
        if (subjectChanged) {
          setSubject(nextSubject);
          setQuery("");
          setTopic(null);
          setCategory(null);
          setTab("formulas");
        }
        if (pageChanged) setPage(nextPage);
        if (linkChanged) {
          setLinkedId(nextLinked);
          if (nextLinked) {
            setQuery("");
            setTopic(null);
            setTab("formulas");
          }
        }
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

  const subjectFormulas = useMemo(() => (subject ? formulasFor(formulas, subject) : []), [subject]);
  const subjectNotations = useMemo(() => (subject ? notationsFor(notations, subject) : []), [subject]);
  const formulaSearchPool = useMemo(() => (subject ? searchPool(formulas, subject) : []), [subject]);
  const notationSearchPool = useMemo(() => (subject ? searchPool(notations, subject) : []), [subject]);

  const topics = useMemo(() => topicsOf(subjectFormulas), [subjectFormulas]);
  const categories = useMemo(() => categoriesOf(subjectNotations), [subjectNotations]);

  const formulaResults = useMemo(() => {
    const pool = query.trim() ? formulaSearchPool : subjectFormulas;
    const found = searchFormulas(pool, query, cardNotes.notes);
    if (!topic || query.trim()) return found;
    return found.filter((formula) => formula.topic === topic);
  }, [cardNotes.notes, formulaSearchPool, query, subjectFormulas, topic]);

  const notationResults = useMemo(() => {
    const pool = query.trim() ? notationSearchPool : subjectNotations;
    const found = searchNotations(pool, query);
    if (!category || query.trim()) return found;
    return found.filter((row) => row.category === category);
  }, [category, notationSearchPool, query, subjectNotations]);

  const savedFormulas = useMemo(
    () => searchFormulas(pickByIds(favourites.formulaIds, formulaById), query, cardNotes.notes),
    [cardNotes.notes, favourites.formulaIds, query],
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
  const waiting = phase.status === "loading" || phase.status === "recovery";
  const showPicker = !subject && tab !== "saved";
  const subjectLabel = !subject ? "Maths & Physics" : subject === "physics" ? "Physics" : "Maths";
  const eyebrow = profile?.name ? `${profile.name} · ${subjectLabel}` : `EB · ${subjectLabel}`;
  const shellClass = page || waiting ? "shell shell-page" : tab === "ask" && subject ? "shell shell-ask" : "shell";

  const linkedFormula = linkedId ? (formulaById.get(linkedId) ?? null) : null;
  const linkedMissing = Boolean(linkedId) && !linkedFormula;
  const formulaCards =
    linkedMissing
      ? []
      : linkedFormula && !formulaResults.some((item) => item.id === linkedFormula.id)
        ? [linkedFormula, ...formulaResults]
        : formulaResults;
  const recentFormulas = recent.ids.flatMap((id) => {
    const formula = formulaById.get(id);
    return formula ? [formula] : [];
  });

  function coursesVisible(formula: Formula) {
    if (tab === "saved") return true;
    return !subjectFormulas.some((item) => item.id === formula.id);
  }

  useEffect(() => {
    document.title = page ? `${PAGE_TITLE[page]} · EB Memento` : "EB Memento";
  }, [page]);

  const profileKey = `${ownerId ?? ""}|${profile?.year ?? ""}|${profile?.maths ?? ""}|${profile?.advanced ?? ""}|${profile?.physics ?? ""}`;
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
    if (page || !linkedId) return;
    const formula = formulaById.get(linkedId);
    if (!formula) return;
    const next = subjectForFormula(formula);
    const subjectNow = next ?? subjectRef.current;
    if (!subjectNow) return;
    const path = formulaHref(linkedId, subjectNow);
    const here = `${window.location.pathname}${window.location.hash}`;
    if (here !== path) history.replaceState(null, "", path);
    if (next && next !== subject) {
      subjectRef.current = next;
      setSubject(next);
      setQuery("");
      setTopic(null);
      setCategory(null);
      setTab("formulas");
    }
  }, [page, linkedId, subject]);

  useEffect(() => {
    if (!ownerId || !linkedId || !formulaById.has(linkedId)) return;
    recent.remember(linkedId);
  }, [linkedId, ownerId, recent.remember]);

  useEffect(() => {
    if (page || waiting || showPicker || tab !== "formulas" || linkedRef.current) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    searchRef.current?.focus();
  }, [page, showPicker, tab, waiting]);

  function clearFormulaPath() {
    const hash = hashForSubject(subjectRef.current);
    if (formulaIdFromPath(window.location.pathname)) {
      history.replaceState(null, "", `/${hash}`);
    }
    linkedRef.current = null;
    setLinkedId(null);
  }

  function openFormula(id: string) {
    const formula = formulaById.get(id);
    if (!formula) return;
    const next = subjectForFormula(formula);
    const subjectNow = next ?? subjectRef.current ?? "maths";
    history.replaceState(null, "", formulaHref(id, subjectNow));
    linkedRef.current = id;
    withTransition(() => {
      setLinkedId(id);
      setQuery("");
      setTopic(null);
      setCategory(null);
      setTab("formulas");
      if (next && next !== subjectRef.current) {
        subjectRef.current = next;
        setSubject(next);
      }
    });
  }

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
          {subject && !page ? (
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
      {phase.status === "loading" ? (
        <p className="empty">Opening…</p>
      ) : phase.status === "recovery" ? (
        <NewPassword email={email} onSave={finishRecovery} />
      ) : page ? (
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
          ownerId={ownerId}
          remote={remote}
          onSaveProfile={(next, name, username) => saveClass(name, username, next)}
          onSignIn={signIn}
          onSignUp={signUp}
          onReset={sendReset}
          onSignOut={() => {
            void signOut();
            closePage();
          }}
          onChangePassword={changePassword}
          onDeleteAccount={async (password) => {
            const message = await deleteAccount(password);
            if (!message) closePage();
            return message;
          }}
          onClose={closePage}
          onBack={backPage}
          onOpen={openPage}
        />
      ) : tab !== "ask" && !showPicker ? (
        <label className="search">
          <span className="sr-only">{searchLabel}</span>
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (value.trim() && linkedRef.current) clearFormulaPath();
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
          {!query.trim() && recentFormulas.length > 0 ? (
            <div className="recent-row">
              <p className="recent-label">Recent</p>
              <div className="recent">
                {recentFormulas.map((formula) => (
                  <button
                    key={formula.id}
                    type="button"
                    className={formula.id === linkedId ? "on" : undefined}
                    onClick={() => openFormula(formula.id)}
                  >
                    {formula.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!query.trim() ? (
            <ChipRow label="Topics">
              <button
                type="button"
                className={!topic ? "on" : undefined}
                onClick={() => {
                  setTopic(null);
                  if (linkedRef.current) clearFormulaPath();
                }}
              >
                All
              </button>
              {topics.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={topic === name ? "on" : undefined}
                  onClick={() => {
                    setTopic(name === topic ? null : name);
                    if (linkedRef.current) clearFormulaPath();
                  }}
                >
                  {name}
                </button>
              ))}
            </ChipRow>
          ) : null}

          <section className="results">
            {linkedMissing ? (
              <p className="empty">That formula is not in the sheet.</p>
            ) : formulaCards.length === 0 ? (
              <p className="empty">No match. Try another word, or a topic.</p>
            ) : (
              formulaCards.map((formula) => (
                <FormulaCard
                  key={formula.id}
                  formula={formula}
                  saved={favourites.isFormulaSaved(formula.id)}
                  showCourses={coursesVisible(formula)}
                  yours={profile ? onCourse(formula, profile) : false}
                  symbolsOpen={formula.id === linkedId}
                  note={cardNotes.noteFor(formula.id)}
                  onNote={(text) => cardNotes.setNote(formula.id, text)}
                  onToggleSaved={() => favourites.toggleFormula(formula.id)}
                  onSymbolsOpen={() => recent.remember(formula.id)}
                />
              ))
            )}
          </section>
        </>
      ) : null}

      {subject && tab === "ask" ? (
        <AskChat
          key={`${subject}:${ownerId ?? ""}`}
          subject={subject}
          accountId={ownerId ?? ""}
          formulas={formulaSearchPool}
          formulaById={formulaById}
          isOnCourse={(formula) => (profile ? onCourse(formula, profile) : false)}
          favourites={favourites}
          onOpenFormula={recent.remember}
        />
      ) : null}

      {subject && tab === "notations" ? (
        <>
          <ChipRow label="Categories">
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
          </ChipRow>

          <NotationsTable
            notations={notationResults}
            isSaved={favourites.isNotationSaved}
            yours={(row) => (profile ? onCourse(row, profile) : false)}
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
                    showCourses
                    yours={profile ? onCourse(formula, profile) : false}
                    symbolsOpen={false}
                    note={cardNotes.noteFor(formula.id)}
                    onNote={(text) => cardNotes.setNote(formula.id, text)}
                    onToggleSaved={() => favourites.toggleFormula(formula.id)}
                    onSymbolsOpen={() => recent.remember(formula.id)}
                  />
                ))}
              </section>
            ) : null}
            {savedNotations.length > 0 ? (
              <section className="saved-notations" aria-label="Saved notations">
                <NotationsTable
                  notations={savedNotations}
                  isSaved={favourites.isNotationSaved}
                  yours={(row) => (profile ? onCourse(row, profile) : false)}
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

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const leftover = node.scrollWidth - node.clientWidth - node.scrollLeft;
      setMore(leftover > 2);
    };
    update();
    node.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [children]);

  return (
    <nav ref={ref} className={more ? "topics has-more" : "topics"} aria-label={label}>
      {children}
      <span className="topic-fade" aria-hidden="true" />
    </nav>
  );
}
