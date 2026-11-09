import { useState } from "react";
import { isUsernameTaken } from "../lib/local-auth";
import {
  cleanName,
  cleanUsername,
  coversNote,
  usernameExample,
  isUpper,
  mathsChoices,
  type MathsPeriod,
  type Profile,
  type Year,
} from "../lib/profile";

const YEARS: Year[] = ["S4", "S5", "S6", "S7"];

type Props = {
  initial: Profile | null;
  initialName?: string;
  initialUsername?: string;
  ownerId?: string | null;
  showName?: boolean;
  onSave: (profile: Profile, name: string, username: string) => void;
  submitLabel: string;
};

export function ClassForm({
  initial,
  initialName = "",
  initialUsername = "",
  ownerId = null,
  showName = false,
  onSave,
  submitLabel,
}: Props) {
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [year, setYear] = useState<Year | null>(initial?.year ?? null);
  const [maths, setMaths] = useState<MathsPeriod | null>(initial?.maths ?? null);
  const [advanced, setAdvanced] = useState(initial?.advanced ?? false);
  const [physics, setPhysics] = useState(initial?.physics ?? true);

  function pickYear(next: Year) {
    setYear(next);
    setMaths((current) => {
      if (!current) return null;
      return mathsChoices(next).some((choice) => choice.id === current) ? current : null;
    });
    if (!isUpper(next)) setAdvanced(false);
  }

  const draft: Profile | null = year && maths ? { year, maths, advanced, physics } : null;
  const note = draft ? coversNote(draft) : null;
  const upper = year ? isUpper(year) : false;
  const cleaned = cleanName(name);
  const handle = cleanUsername(username);
  const taken = showName && handle !== null && isUsernameTaken(handle, ownerId);
  const nameReady = !showName || (cleaned !== null && handle !== null && !taken);
  const nameStarted = name.trim().length > 0;
  const usernameStarted = username.trim().length > 0;
  const example = usernameExample(name, year);

  return (
    <form
      className="class-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!year || !maths || (showName && (!cleaned || !handle || taken))) return;
        onSave(
          {
            year,
            maths,
            advanced: isUpper(year) && advanced,
            physics,
          },
          cleaned ?? "",
          handle ?? "",
        );
      }}
    >
      {showName ? (
        <label className="name-field">
          <span className="settings-name" id="sign-in-name-label">
            Name
          </span>
          <input
            id="sign-in-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Artem"
            autoComplete="given-name"
            autoCapitalize="words"
            autoCorrect="off"
            maxLength={24}
            required
            aria-labelledby="sign-in-name-label"
            autoFocus
          />
          {nameStarted && !cleaned ? <span className="settings-hint">Use your first name.</span> : null}
        </label>
      ) : null}
      {showName ? (
        <label className="name-field">
          <span className="settings-name" id="sign-in-username-label">
            Username
          </span>
          <input
            id="sign-in-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={example.placeholder}
            autoComplete="username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={16}
            required
            aria-labelledby="sign-in-username-label"
          />
          {taken ? (
            <span className="settings-hint">That username is taken.</span>
          ) : usernameStarted && !handle ? (
            <span className="settings-hint">Use 3–16 letters, numbers, or _. Start with a letter.</span>
          ) : (
            <span className="settings-hint">
              Friends and people at your school find you by this. Capitals stay. {example.hintName} and {example.hintFold}{" "}
              are the same username.
            </span>
          )}
        </label>
      ) : null}
      <div className="settings-card">
        <div className="settings-block settings-choice">
          <p className="settings-name" id="class-year">
            Year
          </p>
          <div className="segment" role="group" aria-labelledby="class-year">
            {YEARS.map((option) => (
              <button
                key={option}
                type="button"
                className={year === option ? "on" : undefined}
                aria-pressed={year === option}
                onClick={() => pickYear(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-block settings-choice">
          <p className="settings-name" id="class-maths">
            Maths
          </p>
          {year ? (
            <div className="segment" role="group" aria-labelledby="class-maths">
              {mathsChoices(year).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={maths === option.id ? "on" : undefined}
                  aria-pressed={maths === option.id}
                  onClick={() => setMaths(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="settings-hint">Choose a year first.</p>
          )}
        </div>

        {upper ? (
          <button
            type="button"
            className={advanced ? "class-toggle on settings-block" : "class-toggle settings-block"}
            aria-pressed={advanced}
            onClick={() => setAdvanced((value) => !value)}
          >
            <span>Advanced maths</span>
            <span>{advanced ? "On" : "Off"}</span>
          </button>
        ) : null}

        <button
          type="button"
          className={physics ? "class-toggle on settings-block" : "class-toggle settings-block"}
          aria-pressed={physics}
          onClick={() => setPhysics((value) => !value)}
        >
          <span>Physics</span>
          <span>{physics ? "On" : "Off"}</span>
        </button>
      </div>

      {note ? <p className="settings-hint class-note">{note}</p> : null}
      {upper ? (
        <p className="settings-hint class-note">Advanced is the extra course, on top of 3 or 5 period.</p>
      ) : null}

      <button type="submit" className="class-save" disabled={!draft || !nameReady}>
        {submitLabel}
      </button>
    </form>
  );
}
