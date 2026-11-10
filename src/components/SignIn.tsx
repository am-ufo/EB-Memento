import { useEffect, useState, type FormEvent } from "react";
import { findLocalEmail } from "../lib/local-auth";
import { deviceDraftFor, type Profile } from "../lib/profile";
import { validEmail } from "../lib/cloud";
import { attemptPause, passwordsReady, pauseMessage } from "../lib/password";
import { ClassForm } from "./ClassForm";
import { PasswordChecklist, PasswordField } from "./PasswordField";

type AuthFns = {
  onSignIn: (email: string, password: string) => Promise<string | null>;
  onSignUp: (email: string, password: string) => Promise<{ error: string | null; confirm: boolean }>;
  onReset: (email: string) => Promise<string | null>;
};

const LOCAL_RESET_NOTICE = "If that email is on this device, you can set a new password. Nothing was sent.";

export function SignIn({
  remote,
  onSignIn,
  onSignUp,
  onReset,
  onCancel,
  cancelLabel = "Back to the sheet",
}: AuthFns & { remote: boolean; onCancel?: () => void; cancelLabel?: string }) {
  const [mode, setMode] = useState<"sign-in" | "create" | "forgot">("sign-in");
  const [resetStep, setResetStep] = useState<"email" | "warn">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tick, setTick] = useState(0);

  const emailOk = validEmail(email);
  const creating = mode === "create";
  const ready = creating ? passwordsReady(password, confirm, email) : password.length >= 8;
  const paused = mode === "sign-in" && !remote && attemptPause(email) > 0;

  useEffect(() => {
    if (mode !== "sign-in" || remote) return;
    let timer = 0;
    const paint = () => {
      const left = attemptPause(email);
      if (left <= 0) {
        setError((current) => (current.startsWith("Too many tries") ? "" : current));
        return false;
      }
      setError(pauseMessage(left));
      return true;
    };
    if (!paint()) return;
    timer = window.setInterval(() => {
      if (!paint()) window.clearInterval(timer);
    }, 400);
    return () => window.clearInterval(timer);
  }, [mode, remote, email, tick]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    if (!emailOk) {
      setError("That email does not look right.");
      return;
    }
    if (mode === "forgot") {
      if (remote) {
        setBusy(true);
        const message = await onReset(email);
        setBusy(false);
        if (message) setError(message);
        else setNotice("If that email has an account, a reset link is on its way.");
        return;
      }
      if (!findLocalEmail(email)) {
        setNotice(LOCAL_RESET_NOTICE);
        return;
      }
      setResetStep("warn");
      return;
    }
    if (mode === "sign-in" && !remote && attemptPause(email) > 0) {
      setError(pauseMessage(attemptPause(email)));
      return;
    }
    if (!ready) {
      setError(creating ? "Check the password rules." : "Use at least 8 characters.");
      return;
    }
    setBusy(true);
    if (creating) {
      const result = await onSignUp(email, password);
      setBusy(false);
      if (result.error) setError(result.error);
      else if (result.confirm) setNotice("Check your email to finish creating the account. Then sign in.");
      return;
    }
    const message = await onSignIn(email, password);
    setBusy(false);
    if (message) {
      setError(message);
      if (message.startsWith("Too many tries")) setTick((value) => value + 1);
    }
  }

  async function confirmReset() {
    if (busy) return;
    setBusy(true);
    setError("");
    const message = await onReset(email);
    setBusy(false);
    if (message) setError(message);
  }

  const title = mode === "create" ? "Create account" : mode === "forgot" ? "Reset password" : "Sign in";
  const lead = remote
    ? "Your email opens the same class, stars, and notes on another device. The sheet still opens offline after that."
    : "Your email and password stay on this device. The sheet opens offline.";

  return (
    <section className="auth-card" aria-labelledby="sign-in-title">
      <h2 id="sign-in-title">{title}</h2>
      <p className="auth-lead">{lead}</p>
      {mode === "forgot" && !remote && resetStep === "warn" ? (
        <div className="auth-warning-block">
          <p className="auth-warning">
            This phone cannot email a reset link. Anyone using it can set a new password for {email}. The class and stars
            stay.
          </p>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="button" className="class-save" disabled={busy} onClick={() => void confirmReset()}>
            {busy ? "Please wait…" : "Set a new password"}
          </button>
          <button type="button" className="text-button class-cancel" onClick={() => switchMode("sign-in")}>
            Back to sign in
          </button>
          {onCancel ? (
            <button type="button" className="text-button class-cancel" onClick={onCancel}>
              {cancelLabel}
            </button>
          ) : null}
        </div>
      ) : (
        <>
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
                spellCheck={false}
                required
              />
            </label>
            {mode === "forgot" ? null : (
              <PasswordField
                label="Password"
                value={password}
                onChange={setPassword}
                autoComplete={creating ? "new-password" : "current-password"}
              />
            )}
            {creating ? (
              <>
                <PasswordField
                  label="Confirm password"
                  value={confirm}
                  onChange={setConfirm}
                  autoComplete="new-password"
                />
                <PasswordChecklist password={password} confirm={confirm} email={email} />
              </>
            ) : null}
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            {notice ? <p className="auth-notice">{notice}</p> : null}
            <button
              type="submit"
              className="class-save"
              disabled={busy || !emailOk || (mode !== "forgot" && !ready) || (mode === "sign-in" && paused)}
            >
              {busy
                ? "Please wait…"
                : creating
                  ? "Create account"
                  : mode === "forgot"
                    ? remote
                      ? "Send reset link"
                      : "Continue"
                    : "Sign in"}
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
          {onCancel ? (
            <button type="button" className="text-button class-cancel" onClick={onCancel}>
              {cancelLabel}
            </button>
          ) : null}
        </>
      )}
    </section>
  );

  function switchMode(next: "sign-in" | "create" | "forgot") {
    setMode(next);
    setResetStep("email");
    setPassword("");
    setConfirm("");
    setError("");
    setNotice("");
  }
}

export function NewPassword({ email, onSave }: { email: string; onSave: (password: string) => Promise<string | null> }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = passwordsReady(password, confirm, email);

  return (
    <section className="auth-card" aria-labelledby="new-password-title">
      <h2 id="new-password-title">New password</h2>
      <p className="auth-lead">This replaces the password for {email || "your account"}.</p>
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
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password" />
        <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        <PasswordChecklist password={password} confirm={confirm} email={email} />
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
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
    <section className="auth-card" aria-labelledby="class-gate-title">
      <h2 id="class-gate-title">Your class</h2>
      <p className="auth-lead">
        {email ? `Signed in as ${email}. ` : ""}
        This marks formulas from your class. You can change it later in Settings.
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
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
