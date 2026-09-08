import type { Formula } from "../types";
import { Katex } from "./Katex";

type Props = {
  formula: Formula;
  selected: boolean;
  onToggle: () => void;
};

export function FormulaCard({ formula, selected, onToggle }: Props) {
  return (
    <article className="card">
      <button type="button" className="card-hit" onClick={onToggle} aria-expanded={selected}>
        <p className="card-topic">{formula.topic}</p>
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
