import type { Notation } from "../types";
import { FavouriteButton } from "./FavouriteButton";
import { Katex } from "./Katex";

type Props = {
  notations: Notation[];
  isSaved: (id: string) => boolean;
  onToggleSaved: (id: string) => void;
};

export function NotationsTable({ notations, isSaved, onToggleSaved }: Props) {
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
            <th scope="col">
              <span className="sr-only">Favourites</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {notations.map((row) => (
            <tr key={row.id}>
              <td className="sheet-sym">
                <Katex tex={row.symbol} display={false} />
              </td>
              <td className="sheet-name">
                {row.name}
                <span className="sheet-course">
                  {row.courses.map((course) => course.replaceAll("-", " ")).join(" · ")}
                </span>
              </td>
              <td className="sheet-mean">{row.meaning}</td>
              <td className="sheet-fav">
                <FavouriteButton
                  saved={isSaved(row.id)}
                  label={row.name}
                  onToggle={() => onToggleSaved(row.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
