import type { Formula } from "../types";
import { FavouriteButton } from "./FavouriteButton";
import { Katex } from "./Katex";

type Props = {
  formula: Formula;
  selected: boolean;
  saved: boolean;
  onToggle: () => void;
  onToggleSaved: () => void;
};

export function FormulaCard({ formula, selected, saved, onToggle, onToggleSaved }: Props) {
  return (
    <article className="card">
      <div className="card-head">
        <p className="card-topic">
          {formula.topic}
          {" · "}
          {formula.courses.map((course) => course.replaceAll("-", " ")).join(" · ")}
        </p>
        <FavouriteButton saved={saved} label={formula.title} onToggle={onToggleSaved} />
      </div>
      <button type="button" className="card-hit" onClick={onToggle} aria-expanded={selected}>
        <h2>{formula.title}</h2>
        <Katex tex={formula.katex} />
      </button>
      {selected ? (
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
      ) : (
        <p className="hint">Tap for variables</p>
      )}
    </article>
  );
}
