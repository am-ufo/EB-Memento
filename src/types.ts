export type Variable = {
  symbol: string;
  meaning: string;
};

export type Formula = {
  id: string;
  /** Present from day one. No course picker until mixed content needs one. */
  courses: string[];
  topic: string;
  title: string;
  aliases: string[];
  katex: string;
  variables: Variable[];
};
