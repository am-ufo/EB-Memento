import type { ReactNode } from "react";
import type { TeacherId } from "../lib/teacher";

function Eyes({ cx = 27, gap = 10, cy, r = 1.15 }: { cx?: number; gap?: number; cy: number; r?: number }) {
  return (
    <g className="prof-gaze">
      <circle className="prof-eye" cx={cx} cy={cy} r={r} />
      <circle className="prof-eye" cx={cx + gap} cy={cy} r={r} />
    </g>
  );
}

function Mouth({ y, smile }: { y: number; smile: string }) {
  return (
    <>
      <path className="prof-mouth prof-mouth-smile" d={smile} />
      <path className="prof-mouth prof-mouth-flat" d={`M${29} ${y}h6`} />
    </>
  );
}

function HairGrain({
  id,
  hair,
  d,
  evenodd = false,
}: {
  id: string;
  hair: string;
  d: string;
  evenodd?: boolean;
}) {
  return (
    <>
      <clipPath id={id} clipPathUnits="userSpaceOnUse">
        <path d={hair} clipRule={evenodd ? "evenodd" : "nonzero"} />
      </clipPath>
      <path className="prof-grain" clipPath={`url(#${id})`} d={d} />
    </>
  );
}

function Body() {
  return (
    <g className="prof-shoulders">
      <path className="prof-body" d="M14 63c1-15 8-22 18-22s17 7 18 22" />
    </g>
  );
}

function VeritasiumFigure() {
  return (
    <>
      <g className="prof-shoulders">
        <path className="prof-shirt" d="M13 64C14 50 21 44 32 44C43 44 50 50 51 64" />
        <path className="prof-collar" d="M27.2 44.2h9.6L32 51Z" />
      </g>
      <g className="prof-head">
        <circle className="prof-face" cx="32" cy="27" r="11.5" />
        <path className="prof-hair" d="M19.2 22.8C21.6 12.2 26.4 10.2 32 10.2C37.6 10.2 42.4 12.2 44.8 22.8A2 2 0 0 1 41 24.1A10 10 0 0 0 23 24.1A2 2 0 0 1 19.2 22.8Z" />
        <HairGrain
          id="veritasium-hair-clip"
          hair="M19.2 22.8C21.6 12.2 26.4 10.2 32 10.2C37.6 10.2 42.4 12.2 44.8 22.8A2 2 0 0 1 41 24.1A10 10 0 0 0 23 24.1A2 2 0 0 1 19.2 22.8Z"
          d="M26.4 15.8q1.8-.4 3.4 0M33 15.4q1.6-.35 3 0"
        />
        <Eyes cy={25.2} r={1} />
        <path className="prof-hair" d="M25.4 31Q28.8 32.8 32 32Q35.2 32.8 38.6 31Q35.2 32.2 32 31.6Q28.8 32.2 25.4 31Z" />
        <Mouth y={33.8} smile="M28.8 32.9c.9.9 5.4.9 6.4 0" />
        <path className="prof-hair" d="M24 38.4C22.4 41.4 26.2 42.4 32 42.4C37.8 42.4 41.6 41.4 40 38.4A2.4 2.4 0 0 0 37.2 34.4A10.2 10.2 0 0 1 26.8 34.4A2.4 2.4 0 0 0 24 38.4Z" />
        <HairGrain
          id="veritasium-beard-clip"
          hair="M24 38.4C22.4 41.4 26.2 42.4 32 42.4C37.8 42.4 41.6 41.4 40 38.4A2.4 2.4 0 0 0 37.2 34.4A10.2 10.2 0 0 1 26.8 34.4A2.4 2.4 0 0 0 24 38.4Z"
          d="M29.2 39.8q1.2.25 2.4 0"
        />
      </g>
    </>
  );
}

function RezaFigure() {
  return (
    <>
      <g className="prof-shoulders">
        <path className="prof-body prof-vest" d="M12 64C13 49 20 43 32 43C44 43 51 49 52 64" />
        <path className="prof-collar" d="M25.5 43.5h13L32 55Z" />
      </g>
      <g className="prof-head">
        <ellipse className="prof-face" cx="32" cy="29" rx="11.4" ry="12" />
        <path className="prof-hair" d="M20.8 26C19.6 16 25.5 13 32 13C38.5 13 44.4 16 43.2 26C40 20.4 36.2 18.2 32 18.6C27.8 18.2 24 20.4 20.8 26Z" />
        <HairGrain
          id="reza-hair-clip"
          hair="M20.8 26C19.6 16 25.5 13 32 13C38.5 13 44.4 16 43.2 26C40 20.4 36.2 18.2 32 18.6C27.8 18.2 24 20.4 20.8 26Z"
          d="M27.2 16.2q1.6-.35 3 0M33 15.8q1.4-.3 2.6 0"
        />
        <path className="prof-brow" d="M24.4 25.2h5" />
        <path className="prof-brow" d="M34.6 25.2h5" />
        <Eyes cx={26.6} gap={10.4} cy={27.2} r={1} />
        <Mouth y={35} smile="M29 34c.9 1 5.2 1 6.2 0" />
        <path className="prof-hair" d="M30.2 35.8h3.6c.25 2.6-.9 3.8-1.8 3.8s-2.05-1.2-1.8-3.8Z" />
      </g>
    </>
  );
}

function NewtonFigure() {
  return (
    <>
      <Body />
      <g className="prof-head">
        <ellipse className="prof-face" cx="32" cy="28" rx="10" ry="11.2" />
        <path
          className="prof-hair prof-hair-grey prof-bridge"
          d="M23.3 33.6A10 11.2 0 1 1 40.7 33.6L42.6 44C43.6 48 48 50 49 46C50 32 49 18 44 14C39 11 25 11 20 14C15 18 14 32 15 46C16 50 20.4 48 21.4 44Z"
        />
        <HairGrain
          id="newton-hair-clip"
          hair="M23.3 33.6A10 11.2 0 1 1 40.7 33.6L42.6 44C43.6 48 48 50 49 46C50 32 49 18 44 14C39 11 25 11 20 14C15 18 14 32 15 46C16 50 20.4 48 21.4 44Z"
          d="M27.4 15q1.6-.4 3 0M33.2 14.6q1.4-.3 2.6 0M18.6 33q-.4 1.6.3 3M45.2 33q.4 1.6-.3 3"
        />
        <path
          className="prof-hair-grey prof-hair-edge"
          d="M21.4 44C20.4 48 16 50 15 46C14 32 15 18 20 14C25 11 39 11 44 14C49 18 50 32 49 46C48 50 43.6 48 42.6 44"
        />
        <path className="prof-brow" d="M26.2 25.4c1.2-.7 2.6-.7 3.6 0" />
        <path className="prof-brow" d="M34.2 25.4c1-.7 2.6-.7 3.6 0" />
        <Eyes cx={27.6} gap={8.2} cy={27.6} r={1.1} />
        <Mouth y={35.2} smile="M29.2 34.2c1.1 1.2 4.6 1.2 5.6 0" />
      </g>
      <g className="prof-drop">
        <circle className="prof-apple" cx="11" cy="51" r="7.2" />
        <path className="prof-stem" d="M11 44v-2.2" />
      </g>
    </>
  );
}

function EinsteinFigure() {
  return (
    <>
      <Body />
      <g className="prof-head">
        <circle className="prof-face" cx="32" cy="27" r="11" />
        <path
          className="prof-hair prof-hair-grey prof-bridge"
          fillRule="evenodd"
          d="M32 40C38 42 44 38 46 34C52 32 56 26 52 22C54 16 48 12 42 12C40 8 36 8 32 8C28 8 24 8 22 12C16 12 10 16 12 22C8 26 12 32 18 34C20 38 26 42 32 40ZM32 27m-11.35 0a11.35 11.35 0 1 0 22.7 0a11.35 11.35 0 1 0 -22.7 0"
        />
        <HairGrain
          id="einstein-hair-clip"
          evenodd
          hair="M32 40C38 42 44 38 46 34C52 32 56 26 52 22C54 16 48 12 42 12C40 8 36 8 32 8C28 8 24 8 22 12C16 12 10 16 12 22C8 26 12 32 18 34C20 38 26 42 32 40ZM32 27m-11.35 0a11.35 11.35 0 1 0 22.7 0a11.35 11.35 0 1 0 -22.7 0"
          d="M27 11q1.6-.35 3 0M34 10.6q1.4-.3 2.6 0M14.6 25q-.5 1.4.4 2.6M49.2 25q.5 1.4-.4 2.6"
        />
        <path
          className="prof-hair-grey prof-hair-edge"
          d="M32 40C38 42 44 38 46 34C52 32 56 26 52 22C54 16 48 12 42 12C40 8 36 8 32 8C28 8 24 8 22 12C16 12 10 16 12 22C8 26 12 32 18 34C20 38 26 42 32 40Z"
        />
        <Eyes cy={26.4} r={0.95} />
        <path className="prof-moustache" d="M26 32.4Q29 34.8 32 33.4Q35 34.8 38 32.4Q35 33.8 32 33Q29 33.8 26 32.4Z" />
        <Mouth y={36.2} smile="M29.2 35.4c.8.7 4.8.7 5.6 0" />
        <path className="prof-tongue" d="M30.4 35.8h3.2c0 2.4-1.6 3.4-1.6 3.4s-1.6-1-1.6-3.4Z" />
      </g>
    </>
  );
}

const FIGURES: Record<TeacherId, () => ReactNode> = {
  einstein: EinsteinFigure,
  reza: RezaFigure,
  newton: NewtonFigure,
  veritasium: VeritasiumFigure,
};

export function TeacherFigure({ id }: { id: TeacherId }) {
  const Figure = FIGURES[id];
  return <Figure />;
}
