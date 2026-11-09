import { useState, type FormEvent } from "react";
import { findLocalEmail } from "../lib/local-auth";
import { deviceDraftFor, type Profile } from "../lib/profile";
import { validEmail } from "../lib/cloud";
import { ClassForm } from "./ClassForm";

type AuthFns = {
  onSignIn: (email: string, password: string) => Promise<string | null>;
  onSignUp: (email: string, password: string) => Promise<{ error: string | null; confirm: boolean }>;
  onReset: (email: string) => Promise<string | null>;
};

export function SignIn({ remote, onSignIn, onSignUp, onReset }: AuthFns & { remote: boolean }) {
  const [mode, setMode] = useState<"sign-in" | "create" | "forgot">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const emailOk = validEmail(email);
  const passwordOk = password.length >= 8;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    if (!emailOk) {
      setError("That email does not look right.");
      return;
    }
    if (mode !== "forgot" && !passwordOk) {
      setError("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    if (mode === "forgot") {
      const message = await onReset(email);
      setBusy(false);
      if (message) setError(message);
      else {
        setNotice(
          remote
            ? "If that email has an account, a reset link is on its way."
            : "If that email is on this device, you can set a new password. Nothing was sent.",
        );
      }
      return;
    }
    if (mode === "create") {
      const result = await onSignUp(email, password);
      setBusy(false);
      if (result.error) setError(result.error);
      else if (result.confirm) setNotice("Check your email to finish creating the account. Then sign in.");
      return;
    }
    const message = await onSignIn(email, password);
    setBusy(false);
    if (message) setError(message);
  }

  const title = mode === "create" ? "Create account" : mode === "forgot" ? "Reset password" : "Sign in";

  return (
    <section className="class-setup sign-in" aria-labelledby="sign-in-title">
      <h2 id="sign-in-title">{title}</h2>
      <p className="empty">
        {remote
          ? "Your email opens the same class and the same stars on another device. The sheet still opens offline after that."
          : "Your email and password stay on this device. The sheet opens offline."}
      </p>
      <form className="class-form" onSubmit={(event) => void submit(event)}>
        <label className="name-field">
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="email"
            required
          />
        </label>
        {mode === "forgot" ? null : (
          <label className="name-field">
            Password
            <span className="secret-field">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "create" ? "new-password" : "current-password"}
                minLength={8}
                required
              />
              <button type="button" className="text-button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>
        )}
        {error ? <p className="form-error">{error}</p> : null}
        {notice ? <p className="empty">{notice}</p> : null}
        <button
          type="submit"
          className="class-save"
          disabled={busy || !emailOk || (mode !== "forgot" && !passwordOk)}
        >
          {busy ? "Please wait…" : mode === "create" ? "Create account" : mode === "forgot" ? (remote ? "Send reset link" : "Set a new password") : "Sign in"}
        </button>
      </form>
      {mode === "sign-in" ? (
        <div className="sign-in-links">
          <button type="button" className="text-button" onClick={() => switchMode("create")}>
            Create account
          </button>
          <button type="button" className="text-button" onClick={() => switchMode("forgot")}>
            Forgot password
          </button>
        </div>
      ) : (
        <button type="button" className="text-button class-cancel" onClick={() => switchMode("sign-in")}>
          Back to sign in
        </button>
      )}
    </section>
  );

  function switchMode(next: "sign-in" | "create" | "forgot") {
    setMode(next);
    setError("");
    setNotice("");
  }
}

export function NewPassword({ onSave }: { onSave: (password: string) => Promise<string | null> }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = password.length >= 8;

  return (
    <section className="class-setup sign-in" aria-labelledby="new-password-title">
      <h2 id="new-password-title">New password</h2>
      <p className="empty">Choose a password of at least 8 characters.</p>
      <form
        className="class-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready || busy) return;
          setBusy(true);
          setError("");
          void onSave(password).then((message) => {
            setBusy(false);
            if (message) setError(message);
          });
        }}
      >
        <label className="name-field">
          Password
          <span className="secret-field">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button type="button" className="text-button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" className="class-save" disabled={!ready || busy}>
          {busy ? "Please wait…" : "Save password"}
        </button>
      </form>
    </section>
  );
}

export function ClassGate({
  email,
  ownerId,
  onSave,
}: {
  email: string;
  ownerId: string;
  onSave: (name: string, username: string, profile: Profile) => Promise<string | null>;
}) {
  const local = findLocalEmail(email);
  const draft = deviceDraftFor(email);
  const [error, setError] = useState("");

  return (
    <section className="class-setup sign-in" aria-labelledby="class-gate-title">
      <h2 id="class-gate-title">Your class</h2>
      <p className="empty">
        {email ? `Signed in as ${email}. ` : ""}
        This chooses the sheet. You can change it later in Settings.
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      <ClassForm
        initial={local?.profile ?? draft}
        initialName={local?.name || draft?.name || ""}
        initialUsername={local?.username || draft?.username || ""}
        ownerId={ownerId}
        showName
        submitLabel="Continue"
        onSave={(profile, name, username) => {
          setError("");
          void onSave(name, username, profile).then((message) => {
            if (message) setError(message);
          });
        }}
      />
    </section>
  );
}
