import { useState } from "react";
import type { Formula } from "../types";
import { FavouriteButton } from "./FavouriteButton";
import { Katex } from "./Katex";

type Props = {
  formula: Formula;
  saved: boolean;
  onToggleSaved: () => void;
};

export function FormulaCard({ formula, saved, onToggleSaved }: Props) {
  const [showUseWhen, setShowUseWhen] = useState(false);

  return (
    <article className="card">
      <div className="card-head">
        <p className="card-topic">
          {formula.topic}
          {" · "}
          {formula.courses.map((course) => course.replaceAll("-", " ")).join(" · ")}
        </p>
        <div className="card-actions">
          <button
            type="button"
            className={showUseWhen ? "help on" : "help"}
            aria-expanded={showUseWhen}
            aria-label="When to use this formula"
            onClick={() => setShowUseWhen((open) => !open)}
          >
            ?
          </button>
          <FavouriteButton saved={saved} label={formula.title} onToggle={onToggleSaved} />
        </div>
      </div>
      <h2>{formula.title}</h2>
      <Katex tex={formula.katex} />
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
      <div className={showUseWhen ? "use-when-wrap open" : "use-when-wrap"}>
        <div className="use-when-clip">
          <p className="use-when" inert={!showUseWhen} aria-hidden={showUseWhen ? undefined : true}>
            <span className="use-when-label">Use when</span>
            {formula.useWhen}
          </p>
        </div>
      </div>
    </article>
  );
}
