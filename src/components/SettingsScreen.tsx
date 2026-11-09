import { useEffect, useRef, useState } from "react";
import { SITE, cookieSettingsHint, updatedLine } from "../data/notices";
import { PAGE_HEADING, type Page } from "../lib/pages";
import { coversNote, initials, profileLabel, type Account, type Profile } from "../lib/profile";
import { clearDevice, hasAskThread, hasDeviceData } from "../lib/storage";
import type { TextSize } from "../lib/text-size";
import type { ThemePreference } from "../lib/theme";
import { passwordsReady } from "../lib/password";
import { ClassForm } from "./ClassForm";
import { NoticeBody } from "./NoticeBody";
import { PasswordChecklist, PasswordField } from "./PasswordField";

type Props = {
  page: Page;
  preference: ThemePreference;
  onPreference: (value: ThemePreference) => void;
  textSize: TextSize;
  onTextSize: (value: TextSize) => void;
  formulaCount: number;
  notationCount: number;
  profile: Account | null;
  email: string;
  onSaveProfile: (profile: Profile, name: string, username: string) => Promise<string | null>;
  onSignOut: () => void;
  onChangePassword: (current: string, next: string) => Promise<string | null>;
  onDeleteAccount: (password: string) => Promise<string | null>;
  onClose: () => void;
  onBack: () => void;
  onOpen: (page: Page) => void;
};

type PendingClear = "favourites" | "ask" | "all" | "person";

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

const SIZES: { id: TextSize; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "large", label: "Large" },
];

export function SettingsScreen({
  page,
  preference,
  onPreference,
  textSize,
  onTextSize,
  formulaCount,
  notationCount,
  profile,
  email,
  onSaveProfile,
  onSignOut,
  onChangePassword,
  onDeleteAccount,
  onClose,
  onBack,
  onOpen,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [page]);

  return (
    <div className="pages">
      <div className="page-bar">
        {page === "settings" ? (
          <span />
        ) : (
          <button type="button" onClick={onBack}>
            Back
          </button>
        )}
        <h2 ref={headingRef} tabIndex={-1}>
          {PAGE_HEADING[page]}
        </h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      {page === "settings" ? (
        <SettingsHome
          preference={preference}
          onPreference={onPreference}
          textSize={textSize}
          onTextSize={onTextSize}
          formulaCount={formulaCount}
          notationCount={notationCount}
          profile={profile}
          email={email}
          onSaveProfile={onSaveProfile}
          onSignOut={onSignOut}
          onChangePassword={onChangePassword}
          onDeleteAccount={onDeleteAccount}
          onOpen={onOpen}
        />
      ) : (
        <NoticeBody page={page} onOpen={onOpen} />
      )}
    </div>
  );
}

function SettingsHome({
  preference,
  onPreference,
  textSize,
  onTextSize,
  formulaCount,
  notationCount,
  profile,
  email,
  onSaveProfile,
  onSignOut,
  onChangePassword,
  onDeleteAccount,
  onOpen,
}: Omit<Props, "page" | "onClose" | "onBack">) {
  const [pending, setPending] = useState<PendingClear | null>(null);
  const [editingClass, setEditingClass] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [, setRevision] = useState(0);
  const askOpen = hasAskThread(profile?.id ?? null);
  const stored = hasDeviceData();
  const starred = formulaCount + notationCount;
  const nothing = starred === 0 && !askOpen && !stored;
  const installed = useInstalled();

  function finish(next: string) {
    setPending(null);
    setStatus(next);
    setRevision((value) => value + 1);
  }

  return (
    <div className="settings-home">
      <h3 className="settings-label">Signed in</h3>
      {profile && !editingClass ? (
        <div className="settings-card">
          <div className="settings-row">
            <div className="signed-in">
              <span className="avatar" aria-hidden="true">
                {initials(profile.name)}
              </span>
              <div>
                <p className="settings-name">{profile.name || "Add your name"}</p>
                <p className="settings-hint">{profile.username ? `@${profile.username}` : "Add a username"}</p>
                <p className="settings-hint">{email ? `Signed in as ${email}` : "Signed in"}</p>
              </div>
            </div>
            <button type="button" className="text-button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
          <div className="settings-block">
            <div className="settings-row">
              <div>
                <p className="settings-name">{profileLabel(profile)}</p>
                <p className="settings-hint">{coversNote(profile) ?? "The sheet for this sign-in."}</p>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setStatus("");
                  setPending(null);
                  setEditingPassword(false);
                  setEditingClass(true);
                }}
              >
                Change
              </button>
            </div>
          </div>
          <div className="settings-block">
            <div className="settings-row">
              <div>
                <p className="settings-name">Password</p>
                <p className="settings-hint">Change the password for this email.</p>
              </div>
              {editingPassword ? null : (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setStatus("");
                    setPending(null);
                    setPasswordError("");
                    setCurrentPassword("");
                    setNextPassword("");
                    setConfirmPassword("");
                    setEditingPassword(true);
                  }}
                >
                  Change
                </button>
              )}
            </div>
            {editingPassword ? (
              <form
                className="settings-password"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (passwordBusy || !currentPassword || !passwordsReady(nextPassword, confirmPassword, email)) return;
                  setPasswordBusy(true);
                  setPasswordError("");
                  void onChangePassword(currentPassword, nextPassword).then((message) => {
                    setPasswordBusy(false);
                    if (message) {
                      setPasswordError(message);
                      return;
                    }
                    setEditingPassword(false);
                    setCurrentPassword("");
                    setNextPassword("");
                    setConfirmPassword("");
                    setStatus("Password saved.");
                  });
                }}
              >
                <PasswordField
                  label="Current password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  autoComplete="current-password"
                />
                <PasswordField
                  label="New password"
                  value={nextPassword}
                  onChange={setNextPassword}
                  autoComplete="new-password"
                />
                <PasswordField
                  label="Confirm password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                />
                <PasswordChecklist password={nextPassword} confirm={confirmPassword} email={email} />
                {passwordError ? (
                  <p className="form-error" role="alert">
                    {passwordError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="class-save"
                  disabled={passwordBusy || !currentPassword || !passwordsReady(nextPassword, confirmPassword, email)}
                >
                  {passwordBusy ? "Please wait…" : "Save password"}
                </button>
                <button
                  type="button"
                  className="text-button class-cancel"
                  onClick={() => {
                    setEditingPassword(false);
                    setPasswordError("");
                  }}
                >
                  Keep this password
                </button>
              </form>
            ) : null}
          </div>
          <div className="settings-block">
            <div className="settings-row">
              <div>
                <p className="settings-name">Delete account</p>
                <p className="settings-hint">Deletes the email, the class, and the stars. This cannot be undone.</p>
                {pending === "person" ? (
                  <Confirm
                    prompt={`Delete ${profile.name || "this account"}${email ? ` (${email})` : ""}? Enter your password.`}
                    confirmLabel="Delete account"
                    password={deletePassword}
                    onPassword={(value) => {
                      setDeletePassword(value);
                      setDeleteError("");
                    }}
                    error={deleteError}
                    busy={deleteBusy}
                    onConfirm={() => {
                      if (deleteBusy || !deletePassword) return;
                      setDeleteBusy(true);
                      setDeleteError("");
                      void onDeleteAccount(deletePassword).then((message) => {
                        setDeleteBusy(false);
                        if (message) {
                          setDeleteError(message);
                          return;
                        }
                        finish("Account deleted.");
                      });
                    }}
                    onCancel={() => {
                      setPending(null);
                      setDeleteError("");
                      setDeletePassword("");
                    }}
                  />
                ) : null}
              </div>
              {pending === "person" ? null : (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setStatus("");
                    setEditingPassword(false);
                    setDeletePassword("");
                    setDeleteError("");
                    setPending("person");
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      ) : profile ? (
        <>
          <ClassForm
            key={profileLabel(profile)}
            initial={profile}
            initialName={profile.name}
            initialUsername={profile.username}
            ownerId={profile.id}
            showName
            onSave={(next, name, username) => {
              void onSaveProfile(next, name, username).then((message) => {
                if (message) {
                  setStatus(message);
                  return;
                }
                setEditingClass(false);
                setStatus("Class saved.");
              });
            }}
            submitLabel="Save"
          />
          <button type="button" className="text-button class-cancel" onClick={() => setEditingClass(false)}>
            Keep this class
          </button>
        </>
      ) : (
        <p className="settings-hint settings-note">Signed out. Close this page to sign in.</p>
      )}

      <h3 className="settings-label">Appearance</h3>
      <div className="settings-card">
        <Choice
          label="Theme"
          value={preference}
          options={THEMES}
          onChange={onPreference}
        />
        <Choice label="Text size" value={textSize} options={SIZES} onChange={onTextSize} />
      </div>

      <h3 className="settings-label">On this device</h3>
      <div className="settings-card">
        <div className="settings-block">
          <div className="settings-row">
            <div>
              <p className="settings-name">Favourites</p>
              <p className="settings-hint">{favouriteSummary(formulaCount, notationCount)}</p>
              {pending === "favourites" ? (
                <Confirm
                  prompt="Remove every star?"
                  confirmLabel="Remove"
                  onConfirm={() => {
                    clearDevice(["favourites"]);
                    finish("Stars removed.");
                  }}
                  onCancel={() => setPending(null)}
                />
              ) : null}
            </div>
            {pending === "favourites" ? null : (
              <button
                type="button"
                className="text-button"
                disabled={starred === 0}
                onClick={() => {
                  setStatus("");
                  setPending("favourites");
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="settings-block">
          <div className="settings-row">
            <div>
              <p className="settings-name">Ask</p>
              <p className="settings-hint">
                {askOpen ? "A problem is open in this tab." : "Nothing open in this tab."}
              </p>
              {pending === "ask" ? (
                <Confirm
                  prompt="Forget the open problem?"
                  confirmLabel="Forget"
                  onConfirm={() => {
                    clearDevice(["ask"]);
                    finish("Ask cleared.");
                  }}
                  onCancel={() => setPending(null)}
                />
              ) : null}
            </div>
            {pending === "ask" ? null : (
              <button
                type="button"
                className="text-button"
                disabled={!askOpen}
                onClick={() => {
                  setStatus("");
                  setPending("ask");
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="settings-block">
          <div className="settings-row">
            <div>
              <p className="settings-name">Everything</p>
              <p className="settings-hint">
                {nothing ? "Nothing stored yet." : "Sign-in on this device, theme, text size, stars, and Ask."}
              </p>
              {pending === "all" ? (
                <Confirm
                  prompt="Clear all of that?"
                  confirmLabel="Clear all"
                  onConfirm={() => {
                    clearDevice();
                    finish("Cleared on this device.");
                  }}
                  onCancel={() => setPending(null)}
                />
              ) : null}
            </div>
            {pending === "all" ? null : (
              <button
                type="button"
                className="text-button"
                disabled={nothing}
                onClick={() => {
                  setStatus("");
                  setPending("all");
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="settings-hint settings-note">The offline copy of the app stays until you clear site data in the browser.</p>
      {status ? (
        <p className="settings-status" role="status">
          {status}
        </p>
      ) : null}

      <h3 className="settings-label">About</h3>
      <div className="settings-card">
        <div className="settings-copy">
          <p>
            A pocket sheet of European Baccalaureate maths and physics formulas. Open it, take one answer, close it.
            After the first visit it works offline.
          </p>
          <p>Formulas follow the syllabus. If a line matters for a mark, check the official syllabus.</p>
          <p>
            {installed
              ? "This copy is on your home screen, so it opens offline."
              : "To keep it offline, add Memento to your home screen from the browser menu."}
          </p>
          <p>Made by {SITE.makers}. Not an official European Schools app.</p>
          <p className="settings-hint">Version {SITE.version}</p>
        </div>
      </div>

      <h3 className="settings-label">Policies</h3>
      <div className="settings-card">
        <PolicyLink
          title="Privacy"
          hint="What stays on this device, and what Ask sends"
          onClick={() => onOpen("privacy")}
        />
        <PolicyLink title="Cookies" hint={cookieSettingsHint()} onClick={() => onOpen("cookies")} />
        <PolicyLink
          title="Terms and conditions"
          hint="Not official, and formulas can be wrong"
          onClick={() => onOpen("terms")}
        />
      </div>
      <p className="notice-updated">{updatedLine()}</p>
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const labelId = `${label.toLowerCase().replace(/\s+/g, "-")}-label`;
  return (
    <div className="settings-block settings-choice">
      <p className="settings-name" id={labelId}>
        {label}
      </p>
      <div className="segment" role="group" aria-labelledby={labelId}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={value === option.id ? "on" : undefined}
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Confirm({
  prompt,
  confirmLabel,
  password,
  onPassword,
  error,
  busy = false,
  onConfirm,
  onCancel,
}: {
  prompt: string;
  confirmLabel: string;
  password?: string;
  onPassword?: (value: string) => void;
  error?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={onPassword ? "settings-confirm has-secret" : "settings-confirm"}>
      <span>{prompt}</span>
      {onPassword ? (
        <PasswordField label="Password" value={password ?? ""} onChange={onPassword} autoComplete="current-password" />
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <span className="settings-confirm-actions">
        <button type="button" className="danger" disabled={busy || (onPassword ? !password : false)} onClick={onConfirm}>
          {busy ? "Please wait…" : confirmLabel}
        </button>
        <button type="button" className="quiet" onClick={onCancel}>
          Keep
        </button>
      </span>
    </div>
  );
}

function PolicyLink({ title, hint, onClick }: { title: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" className="settings-link settings-block" onClick={onClick}>
      <span>
        <span className="settings-link-title">{title}</span>
        <span className="settings-link-hint">{hint}</span>
      </span>
      <span className="settings-chevron" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

function favouriteSummary(formulas: number, notations: number): string {
  if (formulas === 0 && notations === 0) return "None yet.";
  const parts: string[] = [];
  if (formulas > 0) parts.push(countLabel(formulas, "formula"));
  if (notations > 0) parts.push(countLabel(notations, "notation"));
  return parts.join(", ");
}

function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function useInstalled(): boolean {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const read = () => {
      const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setInstalled(standalone.matches || ios);
    };
    read();
    standalone.addEventListener("change", read);
    return () => standalone.removeEventListener("change", read);
  }, []);

  return installed;
}
