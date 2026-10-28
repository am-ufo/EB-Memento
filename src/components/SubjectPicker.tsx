import type { Subject } from "../lib/subject";

type Props = {
  onPick: (subject: Subject) => void;
};

export function SubjectPicker({ onPick }: Props) {
  return (
    <nav className="subjects" aria-label="Subjects">
      <button type="button" className="subject-card" onClick={() => onPick("maths")}>
        <span className="subject-rule" aria-hidden="true" />
        <span className="subject-name">Maths</span>
        <span className="subject-hint">Algebra, geometry, analysis</span>
        <span className="subject-mark" aria-hidden="true">
          ∑
        </span>
      </button>
      <button type="button" className="subject-card" onClick={() => onPick("physics")}>
        <span className="subject-rule" aria-hidden="true" />
        <span className="subject-name">Physics</span>
        <span className="subject-hint">Mechanics, fields, waves</span>
        <span className="subject-mark subject-mark-wave" aria-hidden="true">
          <svg viewBox="0 0 120 40">
            <path
              d="M0 20C10 20 10 5 20 5C30 5 30 20 40 20C50 20 50 35 60 35C70 35 70 20 80 20C90 20 90 5 100 5C110 5 110 20 120 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
    </nav>
  );
}
