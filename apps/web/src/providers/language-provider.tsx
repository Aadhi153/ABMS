import { createContext, useContext, useState, type ReactNode } from "react";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
const STORAGE_KEY = "abms-language";

function getInitialLanguage(): LanguageCode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return SUPPORTED_LANGUAGES.some((l) => l.code === stored) ? (stored as LanguageCode) : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(getInitialLanguage);

  const setLanguage = (next: LanguageCode) => {
    setLanguageState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
