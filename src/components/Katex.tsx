import katex from "katex";
import { useMemo } from "react";

type Props = {
  tex: string;
  display?: boolean;
};

export function Katex({ tex, display = true }: Props) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        throwOnError: false,
        displayMode: display,
      }),
    [tex, display],
  );

  return <span className={display ? "katex-block" : undefined} dangerouslySetInnerHTML={{ __html: html }} />;
}
