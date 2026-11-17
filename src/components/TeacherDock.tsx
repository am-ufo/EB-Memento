import type { ProfPose } from "../lib/prof";
import { teacherById, teacherLine, type TeacherId } from "../lib/teacher";
import { TeacherFigure } from "./TeacherFigures";

type Props = {
  id: TeacherId;
  pose: ProfPose;
  seed: string;
  pending: boolean;
  raised: boolean;
  onExample?: () => void;
};

export function TeacherDock({ id, pose, seed, pending, raised, onExample }: Props) {
  const teacher = teacherById(id);
  const line = teacherLine(id, pose, seed);
  const figure = (
    <svg className="prof-svg" viewBox="0 0 64 64" aria-hidden="true">
      <TeacherFigure id={id} />
    </svg>
  );

  return (
    <div className={raised ? "teacher-dock teacher-dock-ask" : "teacher-dock"}>
      <div className="prof-row">
        {onExample ? (
          <button
            type="button"
            className={`prof pose-${pose} teacher-${id}`}
            onClick={onExample}
            disabled={pending}
            aria-label={`${teacher.name}. Tap for another example.`}
          >
            {figure}
          </button>
        ) : (
          <div className={`prof pose-${pose} teacher-${id}`}>{figure}</div>
        )}
        <p className="prof-line">
          <span className="prof-name">{teacher.name}</span>
          {line}
        </p>
      </div>
    </div>
  );
}
