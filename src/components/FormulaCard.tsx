import { useEffect, useRef, useState } from "react";
import { cleanCardNote, MAX_CARD_NOTE } from "../lib/card-notes";
import type { Formula } from "../types";
import { FavouriteButton } from "./FavouriteButton";

import { Katex } from "./Katex";

type Props = {
  formula: Formula;
  saved: boolean;
  showCourses: boolean;
  yours: boolean;
  symbolsOpen: boolean;
  note: string;
  onNote: (text: string) => void;
  onToggleSaved: () => void;
  onSymbolsOpen: () => void;
};

export function FormulaCard({
  formula,
  saved,
  showCourses,
  yours,
  symbolsOpen,
  note,
  onNote,
  onToggleSaved,
  onSymbolsOpen,
}: Props) {
  const [open, setOpen] = useState(symbolsOpen);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);
  const ref = useRef<HTMLElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!symbolsOpen) return;
    setOpen(true);
    ref.current?.scrollIntoView({ block: "nearest" });
  }, [symbolsOpen]);

  useEffect(() => {
    if (!editing) setDraft(note);
  }, [editing, note]);

  useEffect(() => {
    if (editing) noteRef.current?.focus();
  }, [editing]);

  function commit(value: string) {
    if (cleanCardNote(value) === note) return;
    onNote(value);
  }

  const courses = formula.courses.map((course) => course.replaceAll("-", " ")).join(" · ");

  return (
    <article className="card" ref={ref} id={`formula-${formula.id}`}>
      <div className="card-head">
        <p className="card-topic">
          {formula.topic}
          {yours ? <span className="your-course"> · Your course</span> : null}
          {showCourses ? ` · ${courses}` : null}
        </p>
        <div className="card-actions">
          <FavouriteButton saved={saved} label={formula.title} onToggle={onToggleSaved} />
        </div>
      </div>
      <h2>{formula.title}</h2>
      <Katex tex={formula.katex} />
      <p className="use-when">
        <span className="use-when-label">Use when</span>
        {formula.useWhen}
      </p>
      {editing ? (
        <label className="card-note">
          <span className="sr-only">Your note</span>
          <textarea
            ref={noteRef}
            value={draft}
            maxLength={MAX_CARD_NOTE}
            rows={3}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => commit(draft)}
          />
        </label>
      ) : note ? (
        <p className="your-note">
          <span className="use-when-label">Your note</span>
          {note}
        </p>
      ) : null}
      <div className="card-toggles">
        <button
          type="button"
          className={open ? "symbols-toggle on" : "symbols-toggle"}
          aria-expanded={open}
          onClick={() => {
            setOpen((value) => {
              const next = !value;
              if (next) onSymbolsOpen();
              return next;
            });
          }}
        >
          Symbols
        </button>
        <button
          type="button"
          className={editing ? "symbols-toggle on" : "symbols-toggle"}
          aria-expanded={editing}
          onClick={() => {
            setEditing((value) => {
              if (value) commit(draft);
              return !value;
            });
          }}
        >
          Note
        </button>
      </div>
      {open ? (
        <dl className="vars">
          {formula.variables.map((variable) => (
            <div key={variable.symbol}>
              <dt>
                <Katex tex={variable.symbol} display={false} />
              </dt>
              <dd>{variable.meaning}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}
