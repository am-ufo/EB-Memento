import type { Notation } from "../types";
import { Katex } from "./Katex";

type Props = {
  notations: Notation[];
};

export function NotationsTable({ notations }: Props) {
  if (notations.length === 0) {
    return <p className="empty">No match. Try another word, or a category.</p>;
  }

  return (
    <div className="sheet-wrap">
      <table className="sheet">
        <caption className="sr-only">Notations: symbol, name, meaning</caption>
        <thead>
          <tr>
            <th scope="col">Symbol</th>
            <th scope="col">Name</th>
            <th scope="col">Meaning</th>
          </tr>
        </thead>
        <tbody>
          {notations.map((row) => (
            <tr key={row.id}>
              <td className="sheet-sym">
                <Katex tex={row.symbol} display={false} />
              </td>
              <td className="sheet-name">{row.name}</td>
              <td className="sheet-mean">{row.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
