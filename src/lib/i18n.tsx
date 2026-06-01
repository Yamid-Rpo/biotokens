import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "es" | "en";

const DICT = {
  "nav.home":          { es: "Inicio", en: "Home" },
  "nav.projects":      { es: "Proyectos", en: "Projects" },
  "nav.how":           { es: "Cómo funciona", en: "How it works" },
  "nav.sdg":           { es: "ODS", en: "SDGs" },
  
  "nav.contact":       { es: "Contacto", en: "Contact" },
  "nav.login":         { es: "Iniciar sesión", en: "Sign in" },
  "nav.signup":        { es: "Crear cuenta", en: "Sign up" },
  "nav.dashboard":     { es: "Panel", en: "Dashboard" },
  "nav.wallet":        { es: "Billetera", en: "Wallet" },
  "nav.logout":        { es: "Cerrar sesión", en: "Sign out" },
  "hero.title":        { es: "Certificación blockchain para reducir emisiones de carbono", en: "Blockchain certification to reduce carbon emissions" },
  "hero.sub":          { es: "Bio Tokens convierte tu impacto ambiental real en certificados digitales sobre Stellar, intercambiables por XLM y USDC.", en: "Bio Tokens turns your real environmental impact into Stellar digital certificates, exchangeable for XLM and USDC." },
  "hero.cta":          { es: "Comenzar gratis", en: "Get started" },
  "hero.cta2":         { es: "Ver proyectos", en: "See projects" },
  "common.save":       { es: "Guardar", en: "Save" },
  "common.cancel":     { es: "Cancelar", en: "Cancel" },
  "common.accept":     { es: "Aceptar", en: "Accept" },
  "common.email":      { es: "Correo electrónico", en: "Email" },
  "common.password":   { es: "Contraseña", en: "Password" },
  "common.loading":    { es: "Cargando…", en: "Loading…" },
} as const;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");
  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem("bio.lang") as Lang | null) : null;
    if (stored === "es" || stored === "en") setLangState(stored);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("bio.lang", l);
  };
  const t = (k: string) => (DICT as Record<string, { es: string; en: string }>)[k]?.[lang] ?? k;
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
