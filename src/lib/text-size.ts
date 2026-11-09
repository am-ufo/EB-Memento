import { useEffect, useState } from "react";
import { TEXT_KEY } from "../data/notices";
import { clearedIds, DEVICE_CLEARED } from "./storage";

export type TextSize = "default" | "large";

function readStored(): TextSize {
  try {
    return localStorage.getItem(TEXT_KEY) === "large" ? "large" : "default";
  } catch {
    return "default";
  }
}

export function applyTextSize(size: TextSize) {
  if (size === "large") document.documentElement.dataset.text = "large";
  else delete document.documentElement.dataset.text;
}

export function useTextSize() {
  const [size, setSizeState] = useState<TextSize>(readStored);

  useEffect(() => {
    applyTextSize(size);
  }, [size]);

  useEffect(() => {
    const onCleared = (event: Event) => {
      const ids = clearedIds(event);
      if (ids && !ids.includes("text")) return;
      setSizeState(readStored());
    };
    window.addEventListener(DEVICE_CLEARED, onCleared);
    return () => window.removeEventListener(DEVICE_CLEARED, onCleared);
  }, []);

  function setSize(next: TextSize) {
    setSizeState(next);
    try {
      if (next === "default") localStorage.removeItem(TEXT_KEY);
      else localStorage.setItem(TEXT_KEY, next);
    } catch {
      // Private mode — keep the size for this visit.
    }
  }

  return { size, setSize };
}
