import { useId, useState } from "react";
import { passwordTooEasy } from "../lib/password";

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
}) {
  const [shown, setShown] = useState(false);
  const id = useId();

  return (
    <label className="name-field" htmlFor={id}>
      {label}
      <span className="secret-field">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          spellCheck={false}
        />
        <button type="button" className="text-button" onClick={() => setShown((current) => !current)}>
          {shown ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
}

export function PasswordChecklist({
  password,
  confirm,
  email = "",
}: {
  password: string;
  confirm: string;
  email?: string;
}) {
  const long = password.length >= 8;
  const easy = password.length > 0 && !passwordTooEasy(password, email);
  const match = confirm.length > 0 && password === confirm;

  return (
    <ul className="auth-checklist" aria-label="Password requirements">
      <Check met={long} text="At least 8 characters" />
      <Check met={easy} text="Not your email or a common password" />
      <Check met={match} text="Both passwords match" />
    </ul>
  );
}

function Check({ met, text }: { met: boolean; text: string }) {
  return (
    <li className={met ? "met" : undefined}>
      <span className="sr-only">{met ? "Done." : "Not yet."}</span>
      <span aria-hidden="true">{met ? "✓" : "·"}</span>
      {text}
    </li>
  );
}
