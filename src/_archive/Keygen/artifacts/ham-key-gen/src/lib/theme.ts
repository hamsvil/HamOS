import { useEffect, useState, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "auto";
const STORAGE_KEY = "ham-key-gen.theme";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const isDark = mode === "dark" || (mode === "auto" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", isDark);
}

export function readStoredTheme(): ThemeMode {
  if (typeof localStorage === "undefined") return "auto";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" || v === "auto" ? v : "auto";
}

export function initTheme() {
  const mode = readStoredTheme();
  applyTheme(mode);
  if (typeof window !== "undefined") {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", () => {
      if (readStoredTheme() === "auto") applyTheme("auto");
    });
  }
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => readStoredTheme());

  useEffect(() => {
    applyTheme(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* noop */ }
  }, [mode]);

  const cycle = useCallback(() => {
    setMode((m) => (m === "light" ? "dark" : m === "dark" ? "auto" : "light"));
  }, []);

  return { mode, setMode, cycle };
}
