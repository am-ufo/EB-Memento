import { useEffect, useState } from "react";
import { THEME_KEY } from "../data/notices";
import { clearedIds, DEVICE_CLEARED } from "./storage";

export type Theme = "light" | "dark";
export type ThemePreference = "system" | Theme;

const LIGHT_THEME_COLOR = "#f4efe6";
const DARK_THEME_COLOR = "#1b1915";

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    // Private mode — follow the device.
  }
  return "system";
}

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getPreferredTheme(): Theme {
  const preference = readStored();
  return preference === "system" ? systemTheme() : preference;
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}

function writePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_KEY, preference);
  } catch {
    // Private mode — keep the choice for this visit.
  }
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored);
  const [system, setSystem] = useState<Theme>(systemTheme);
  const theme: Theme = preference === "system" ? system : preference;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onCleared = (event: Event) => {
      const ids = clearedIds(event);
      if (ids && !ids.includes("theme")) return;
      setPreferenceState(readStored());
    };
    window.addEventListener(DEVICE_CLEARED, onCleared);
    return () => window.removeEventListener(DEVICE_CLEARED, onCleared);
  }, []);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    writePreference(next);
  }

  function toggle() {
    setPreference(theme === "dark" ? "light" : "dark");
  }

  return { theme, preference, setPreference, toggle };
}
