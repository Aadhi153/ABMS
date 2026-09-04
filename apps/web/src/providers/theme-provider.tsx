import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: ResolvedTheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "abms-theme";

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(getInitialPreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setSystemTheme(getSystemTheme());
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const theme: ResolvedTheme = preference === "system" ? systemTheme : preference;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, preference);
  }, [theme, preference]);

  const setPreference = (next: ThemePreference) => setPreferenceState(next);
  const toggleTheme = () => setPreferenceState(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
