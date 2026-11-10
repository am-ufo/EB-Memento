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
  deviceOwnerId,
  forgetDeviceAccount,
  guestAccount,
  releaseSignedInCache,
  rememberDeviceAccount,
  saveGuestClass,
  type Account,
  type Profile,
} from "./profile";
import { adoptCardNotes, forgetCardNotes, hydrateCardNotes } from "./card-notes";
import { adoptStars, favouritesStorageKey, hydrateFavourites } from "./favourites";
import { adoptRecent, recentStorageKey } from "./recent";
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
  | { status: "recovery"; userId: string; email: string }
  | { status: "needs-class"; userId: string; email: string }
  | { status: "ready"; account: Account | null; email: string; ownerId: string };

function guestPhase(): AuthPhase {
  const ownerId = deviceOwnerId();
  return { status: "ready", account: guestAccount(), email: "", ownerId };
}

/** Move stars, notes, and recent formulas onto the account when that account's copies are empty. */
function adoptDevice(userId: string) {
  const from = deviceOwnerId();
  adoptStars(from, userId);
  adoptCardNotes(from, userId);
  adoptRecent(from, userId);
}

function readySignedIn(userId: string, email: string, account: Account | null): AuthPhase {
  adoptDevice(userId);
  return { status: "ready", account, email, ownerId: userId };
}

function phaseFor(local: LocalAccount | null): AuthPhase {
  if (!local) return guestPhase();
  const name = cleanName(local.name);
  const username = cleanUsername(local.username);
  if (local.profile && name && username) {
    const account = accountFrom(local.id, name, username, local.profile);
    rememberDeviceAccount(account, local.email);
    return readySignedIn(local.id, local.email, account);
  }
  const partial = local.profile ? accountFrom(local.id, name ?? "", username ?? "", local.profile) : null;
  return readySignedIn(local.id, local.email, partial);
}

function accountFrom(userId: string, name: string, username: string, profile: Profile): Account {
  return { id: userId, name, username, ...profile };
}

export function useAccount() {
  const [phase, setPhase] = useState<AuthPhase>(() =>
    accountsConfigured() ? { status: "loading" } : phaseFor(localSession()),
  );

  useEffect(() => {
    if (!accountsConfigured()) {
      setPhase(phaseFor(localSession()));
      return;
    }

    let cancel = false;

    async function settle(user: User | null, recovery: boolean) {
      if (cancel) return;
      if (!user) {
        setPhase(guestPhase());
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
        adoptDevice(user.id);
        setPhase({ status: "ready", account, email, ownerId: user.id });
        void hydrateFavourites(user.id);
        void hydrateCardNotes(user.id);
        return;
      }
      if (remote === "offline") {
        const cached = cachedAccount();
        if (cached && cached.id === user.id) {
          setPhase(readySignedIn(user.id, email || "", cached));
          return;
        }
      }
      setPhase(readySignedIn(user.id, email, null));
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
      forgetDeviceAccount();
      if (accountsConfigured()) void signOutRemote();
      setPhase(guestPhase());
    };
    window.addEventListener(DEVICE_CLEARED, onCleared);
    return () => window.removeEventListener(DEVICE_CLEARED, onCleared);
  }, []);

  const account = phase.status === "ready" ? phase.account : null;
  const email = "email" in phase ? phase.email : "";
  const ownerId = phase.status === "ready" ? phase.ownerId : null;

  async function saveClass(name: string, username: string, profile: Profile): Promise<string | null> {
    if (phase.status !== "needs-class" && phase.status !== "ready") return "Sign in first.";
    if (phase.status === "ready" && !phase.email) {
      const saved = saveGuestClass(profile);
      if (!saved) return "Choose a year and a maths course.";
      setPhase(guestPhase());
      return null;
    }
    const clean = cleanName(name);
    const handle = cleanUsername(username);
    if (!clean) return "Add your name.";
    if (!handle) return "Use 3–16 letters, numbers, or _. Start with a letter.";
    const userId = phase.status === "ready" ? phase.account?.id ?? phase.ownerId : phase.userId;
    if (!accountsConfigured()) {
      const saved = saveLocalClass(userId, clean, handle, profile);
      if (saved === "taken") return "That username is taken.";
      if (!saved) return "Sign in first.";
      const next = accountFrom(userId, clean, handle, profile);
      rememberDeviceAccount(next, saved.email);
      adoptDevice(userId);
      setPhase({ status: "ready", account: next, email: saved.email, ownerId: userId });
      return null;
    }
    const error = await saveProfile(userId, clean, handle, profile);
    if (error) return error;
    const next = accountFrom(userId, clean, handle, profile);
    rememberDeviceAccount(next, email);
    adoptDevice(userId);
    void hydrateFavourites(userId);
    void hydrateCardNotes(userId);
    setPhase({ status: "ready", account: next, email, ownerId: userId });
    return null;
  }

  async function signOut() {
    if (accountsConfigured()) await signOutRemote();
    else signOutLocal();
    releaseSignedInCache();
    setPhase(guestPhase());
  }

  async function changePassword(current: string, next: string): Promise<string | null> {
    if (phase.status !== "ready" || !phase.email || !phase.account) return "Sign in first.";
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
    if (phase.status !== "ready" || !phase.email || !phase.account) return "Sign in first.";
    const signedIn = phase.account;
    if (!password) return "Enter your password.";
    if (!accountsConfigured()) {
      const ok = await verifyLocalPassword(email, password);
      if (!ok) return "Current password is wrong.";
      deleteLocal(signedIn.id);
      try {
        localStorage.removeItem(favouritesStorageKey(signedIn.id));
        localStorage.removeItem(recentStorageKey(signedIn.id));
      } catch {
        // The account record is already gone.
      }
      forgetCardNotes(signedIn.id);
      releaseSignedInCache();
      setPhase(guestPhase());
      return null;
    }
    const confirmed = await confirmPassword(email, password);
    if (confirmed) return confirmed;
    const error = await deleteRemoteAccount();
    if (error) return error;
    try {
      localStorage.removeItem(favouritesStorageKey(signedIn.id));
      localStorage.removeItem(recentStorageKey(signedIn.id));
    } catch {
      // The server account is already gone.
    }
    forgetCardNotes(signedIn.id);
    releaseSignedInCache();
    setPhase(guestPhase());
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
      adoptDevice(phase.userId);
      setPhase({ status: "ready", account: next, email: phase.email, ownerId: phase.userId });
      void hydrateFavourites(phase.userId);
      void hydrateCardNotes(phase.userId);
      return null;
    }
    setPhase(readySignedIn(phase.userId, phase.email, null));
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
    setPhase(phaseFor(result.account));
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
    ownerId,
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
