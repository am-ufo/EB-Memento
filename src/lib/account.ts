import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  accountsConfigured,
  deleteRemoteAccount,
  fetchProfile,
  saveProfile,
  sendPasswordReset,
  confirmPassword,
  signInWithEmail,
  signOutRemote,
  signUpWithEmail,
  updatePassword,
  watchAuth,
} from "./cloud";
import {
  cleanName,
  cleanUsername,
  cachedAccount,
  deviceDraftFor,
  forgetDeviceAccount,
  rememberDeviceAccount,
  type Account,
  type Profile,
} from "./profile";
import { adoptStars, favouritesStorageKey, hydrateFavourites } from "./favourites";
import {
  deleteLocal,
  findLocalEmail,
  localSession,
  matchLocal,
  registerLocal,
  saveLocalClass,
  setLocalPassword,
  signOutLocal,
  verifyLocalPassword,
  type LocalAccount,
} from "./local-auth";
import { attemptPause, clearAttempts, noteFailedAttempt, passwordIssue, pauseMessage } from "./password";
import { clearedIds, DEVICE_CLEARED } from "./storage";

export type AuthPhase =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "recovery"; userId: string; email: string }
  | { status: "needs-class"; userId: string; email: string }
  | { status: "ready"; account: Account; email: string };

function phaseFor(local: LocalAccount | null): AuthPhase {
  if (!local) return { status: "signed-out" };
  const name = cleanName(local.name);
  const username = cleanUsername(local.username);
  if (local.profile && name && username) {
    const account = accountFrom(local.id, name, username, local.profile);
    rememberDeviceAccount(account, local.email);
    return { status: "ready", account, email: local.email };
  }
  return { status: "needs-class", userId: local.id, email: local.email };
}

function accountFrom(userId: string, name: string, username: string, profile: Profile): Account {
  return { id: userId, name, username, ...profile };
}

export function useAccount() {
  const [phase, setPhase] = useState<AuthPhase>({ status: "loading" });

  useEffect(() => {
    if (!accountsConfigured()) {
      setPhase(phaseFor(localSession()));
      return;
    }

    let cancel = false;

    async function settle(user: User | null, recovery: boolean) {
      if (cancel) return;
      if (!user) {
        setPhase({ status: "signed-out" });
        return;
      }
      const email = user.email ?? "";
      if (recovery) {
        setPhase({ status: "recovery", userId: user.id, email });
        return;
      }
      const remote = await fetchProfile(user.id);
      if (cancel) return;
      if (remote && remote !== "offline" && cleanName(remote.name) && cleanUsername(remote.username)) {
        const account = accountFrom(user.id, cleanName(remote.name) ?? remote.name, cleanUsername(remote.username) ?? remote.username, remote);
        rememberDeviceAccount(account, email);
        setPhase({ status: "ready", account, email });
        void hydrateFavourites(user.id);
        return;
      }
      if (remote === "offline") {
        const cached = cachedAccount();
        if (cached && cached.id === user.id && cleanName(cached.name) && cleanUsername(cached.username)) {
          setPhase({ status: "ready", account: cached, email: email || "" });
          return;
        }
      }
      setPhase({ status: "needs-class", userId: user.id, email });
    }

    const stop = watchAuth((event, user) => {
      void settle(user, event === "PASSWORD_RECOVERY");
    });

    return () => {
      cancel = true;
      stop();
    };
  }, []);

  useEffect(() => {
    const onCleared = (event: Event) => {
      const ids = clearedIds(event);
      if (ids && !ids.includes("profile")) return;
      if (accountsConfigured()) void signOutRemote();
      setPhase({ status: "signed-out" });
    };
    window.addEventListener(DEVICE_CLEARED, onCleared);
    return () => window.removeEventListener(DEVICE_CLEARED, onCleared);
  }, []);

  const account = phase.status === "ready" ? phase.account : null;
  const email = "email" in phase ? phase.email : "";

  async function saveClass(name: string, username: string, profile: Profile): Promise<string | null> {
    if (phase.status !== "needs-class" && phase.status !== "ready") return "Sign in first.";
    const clean = cleanName(name);
    const handle = cleanUsername(username);
    if (!clean) return "Add your name.";
    if (!handle) return "Use 3–16 letters, numbers, or _. Start with a letter.";
    const userId = phase.status === "ready" ? phase.account.id : phase.userId;
    const previous = deviceDraftFor(email);
    if (previous && previous.id !== userId) adoptStars(previous.id, userId);
    if (!accountsConfigured()) {
      const saved = saveLocalClass(userId, clean, handle, profile);
      if (saved === "taken") return "That username is taken.";
      if (!saved) return "Sign in first.";
      const next = accountFrom(userId, clean, handle, profile);
      rememberDeviceAccount(next, saved.email);
      setPhase({ status: "ready", account: next, email: saved.email });
      return null;
    }
    const error = await saveProfile(userId, clean, handle, profile);
    if (error) return error;
    const next = accountFrom(userId, clean, handle, profile);
    rememberDeviceAccount(next, email);
    void hydrateFavourites(userId);
    setPhase({ status: "ready", account: next, email });
    return null;
  }

  async function signOut() {
    if (accountsConfigured()) await signOutRemote();
    else signOutLocal();
    forgetDeviceAccount();
    setPhase({ status: "signed-out" });
  }

  async function changePassword(current: string, next: string): Promise<string | null> {
    if (phase.status !== "ready") return "Sign in first.";
    const issue = passwordIssue(next, email);
    if (issue) return issue;
    if (next === current) return "Choose a different password.";
    if (!accountsConfigured()) {
      const ok = await verifyLocalPassword(email, current);
      if (!ok) return "Current password is wrong.";
      const saved = await setLocalPassword(phase.account.id, next);
      return saved ? null : "That did not work. Try again.";
    }
    const confirmed = await confirmPassword(email, current);
    if (confirmed) return confirmed;
    return updatePassword(next);
  }

  async function deleteAccount(password: string): Promise<string | null> {
    if (!account) return "Sign in first.";
    if (!password) return "Enter your password.";
    if (!accountsConfigured()) {
      const ok = await verifyLocalPassword(email, password);
      if (!ok) return "Current password is wrong.";
      deleteLocal(account.id);
      try {
        localStorage.removeItem(favouritesStorageKey(account.id));
      } catch {
        // The account record is already gone.
      }
      forgetDeviceAccount();
      setPhase({ status: "signed-out" });
      return null;
    }
    const confirmed = await confirmPassword(email, password);
    if (confirmed) return confirmed;
    const error = await deleteRemoteAccount();
    if (error) return error;
    try {
      localStorage.removeItem(favouritesStorageKey(account.id));
    } catch {
      // The server account is already gone.
    }
    forgetDeviceAccount();
    setPhase({ status: "signed-out" });
    return null;
  }

  async function finishRecovery(password: string): Promise<string | null> {
    const issue = passwordIssue(password, "email" in phase ? phase.email : "");
    if (issue) return issue;
    if (!accountsConfigured()) {
      if (phase.status !== "recovery") return null;
      const saved = await setLocalPassword(phase.userId, password);
      if (!saved) return "That did not work. Try again.";
      setPhase(phaseFor(saved));
      return null;
    }
    const error = await updatePassword(password);
    if (error) return error;
    if (phase.status !== "recovery") return null;
    const remote = await fetchProfile(phase.userId);
    if (remote && remote !== "offline" && cleanName(remote.name) && cleanUsername(remote.username)) {
      const next = accountFrom(phase.userId, cleanName(remote.name) ?? remote.name, cleanUsername(remote.username) ?? remote.username, remote);
      rememberDeviceAccount(next, phase.email);
      setPhase({ status: "ready", account: next, email: phase.email });
      return null;
    }
    setPhase({ status: "needs-class", userId: phase.userId, email: phase.email });
    return null;
  }

  async function signIn(emailAddress: string, password: string): Promise<string | null> {
    if (accountsConfigured()) return signInWithEmail(emailAddress, password);
    const wait = attemptPause(emailAddress);
    if (wait > 0) return pauseMessage(wait);
    if (password.length < 8) return "Use at least 8 characters.";
    const match = await matchLocal(emailAddress, password);
    if (match === "wrong") {
      const again = noteFailedAttempt(emailAddress);
      return again > 0 ? pauseMessage(again) : "That email or password is wrong.";
    }
    clearAttempts(emailAddress);
    setPhase(phaseFor(match));
    return null;
  }

  async function signUp(emailAddress: string, password: string): Promise<{ error: string | null; confirm: boolean }> {
    const issue = passwordIssue(password, emailAddress);
    if (issue) return { error: issue, confirm: false };
    if (accountsConfigured()) return signUpWithEmail(emailAddress, password);
    const result = await registerLocal(emailAddress, password);
    if (result.error || !result.account) return { error: result.error ?? "That did not work. Try again.", confirm: false };
    setPhase({ status: "needs-class", userId: result.account.id, email: result.account.email });
    return { error: null, confirm: false };
  }

  async function sendReset(emailAddress: string): Promise<string | null> {
    if (accountsConfigured()) return sendPasswordReset(emailAddress);
    const found = findLocalEmail(emailAddress);
    if (found) setPhase({ status: "recovery", userId: found.id, email: found.email });
    return null;
  }

  return {
    phase,
    account,
    email,
    remote: accountsConfigured(),
    signIn,
    signUp,
    sendReset,
    saveClass,
    signOut,
    changePassword,
    deleteAccount,
    finishRecovery,
  };
}
