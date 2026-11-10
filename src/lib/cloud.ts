import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Profile } from "./profile";

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    client = null;
    return null;
  }
  try {
    client = createClient(url, key);
  } catch {
    client = null;
  }
  return client;
}

export function accountsConfigured(): boolean {
  return getSupabase() !== null;
}

export function plainAuthError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("invalid login") || text.includes("invalid credentials")) {
    return "That email or password is wrong.";
  }
  if (text.includes("already registered") || text.includes("already been registered")) {
    return "That email already has an account. Sign in instead.";
  }
  if (text.includes("password")) return "Use at least 8 characters.";
  if (text.includes("email")) return "Check the email address.";
  if (text.includes("network") || text.includes("fetch") || text.includes("failed to fetch")) {
    return "No connection. Try again when you are online.";
  }
  return "That did not work. Try again.";
}

export function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

type ProfileRow = {
  name: string;
  username: string;
  year: Profile["year"];
  maths: Profile["maths"];
  advanced: boolean;
  physics: boolean;
};

export async function fetchProfile(userId: string): Promise<ProfileRow | null | "offline"> {
  const supabase = getSupabase();
  if (!supabase) return "offline";
  const { data, error } = await supabase
    .from("profiles")
    .select("name, username, year, maths, advanced, physics")
    .eq("id", userId)
    .maybeSingle();
  if (error) return "offline";
  if (!data) return null;
  const row = data as ProfileRow;
  const years = ["S4", "S5", "S6", "S7"];
  const periods = ["3", "4", "5", "6"];
  if (
    typeof row.name !== "string" ||
    typeof row.username !== "string" ||
    !years.includes(row.year) ||
    !periods.includes(row.maths) ||
    typeof row.advanced !== "boolean" ||
    typeof row.physics !== "boolean"
  ) {
    return null;
  }
  return row;
}

export async function saveProfile(userId: string, name: string, username: string, profile: Profile): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return "Email accounts are not connected on this copy.";
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    name,
    username,
    year: profile.year,
    maths: profile.maths,
    advanced: profile.advanced,
    physics: profile.physics,
    updated_at: new Date().toISOString(),
  });
  if (!error) return null;
  if (error.code === "23505" || error.message.toLowerCase().includes("username")) return "That username is taken.";
  return plainAuthError(error.message);
}

export async function pullFavourites(
  userId: string,
): Promise<{ formulas: string[]; notations: string[] } | null | "offline"> {
  const supabase = getSupabase();
  if (!supabase) return "offline";
  const { data, error } = await supabase
    .from("favourites")
    .select("formulas, notations")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return "offline";
  if (!data) return null;
  const row = data as { formulas?: unknown; notations?: unknown };
  const formulas = Array.isArray(row.formulas) ? row.formulas.filter((id): id is string => typeof id === "string") : [];
  const notations = Array.isArray(row.notations) ? row.notations.filter((id): id is string => typeof id === "string") : [];
  return { formulas, notations };
}

export async function pushFavourites(userId: string, formulas: string[], notations: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("favourites").upsert({
    user_id: userId,
    formulas,
    notations,
  });
}

function cardNoteMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const notes: Record<string, string> = {};
  for (const [id, text] of Object.entries(value as Record<string, unknown>)) {
    if (typeof text !== "string") continue;
    const clean = text.replace(/\r\n/g, "\n").trim().slice(0, 240);
    if (!id || !clean) continue;
    notes[id] = clean;
  }
  return notes;
}

export async function pullCardNotes(userId: string): Promise<Record<string, string> | null | "offline"> {
  const supabase = getSupabase();
  if (!supabase) return "offline";
  const { data, error } = await supabase.from("card_notes").select("notes").eq("user_id", userId).maybeSingle();
  if (error) return "offline";
  if (!data) return null;
  const row = data as { notes?: unknown };
  return cardNoteMap(row.notes);
}

export async function pushCardNotes(userId: string, notes: Record<string, string>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("card_notes").upsert({
    user_id: userId,
    notes,
  });
}

export async function signInWithEmail(email: string, password: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return "Email accounts are not connected on this copy.";
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? plainAuthError(error.message) : null;
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<{ error: string | null; confirm: boolean }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Email accounts are not connected on this copy.", confirm: false };
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) return { error: plainAuthError(error.message), confirm: false };
  return { error: null, confirm: !data.session };
}

export async function sendPasswordReset(email: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return "Email accounts are not connected on this copy.";
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  });
  return error ? plainAuthError(error.message) : null;
}

export async function confirmPassword(email: string, password: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return "Email accounts are not connected on this copy.";
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (!error) return null;
  const text = error.message.toLowerCase();
  if (text.includes("invalid login") || text.includes("invalid credentials")) return "Current password is wrong.";
  return plainAuthError(error.message);
}

export async function updatePassword(password: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return "Email accounts are not connected on this copy.";
  const { error } = await supabase.auth.updateUser({ password });
  if (!error) return null;
  const text = error.message.toLowerCase();
  if (text.includes("different") || text.includes("same")) return "Choose a different password.";
  return plainAuthError(error.message);
}

export async function deleteRemoteAccount(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return "Email accounts are not connected on this copy.";
  const { error } = await supabase.rpc("delete_own_account");
  if (error) return plainAuthError(error.message);
  await supabase.auth.signOut();
  return null;
}

export async function signOutRemote(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function watchAuth(onChange: (event: string, user: User | null) => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    setTimeout(() => onChange(event, session?.user ?? null), 0);
  });
  return () => data.subscription.unsubscribe();
}
