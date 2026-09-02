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
  "nav.connect":       { es: "Conectar agente", en: "Connect agent" },
  "nav.terms":         { es: "Términos de uso", en: "Terms of use" },
  "nav.privacy":       { es: "Declaración de privacidad", en: "Privacy Policy" },
  "hero.title":        { es: "Certificación blockchain para reducir las emisiones de carbono", en: "Blockchain certification to reduce carbon emissions" },
  "hero.sub":          { es: "Los certificados blockchain son un registro digital que valida y garantiza la disminución de emisiones de carbono, ofreciendo trazabilidad y confianza, estos certificados son tokens verdes que representan un valor económico y pueden ser intercambiados por activos digitales.", en: "Blockchain certificates are a digital record that validates and guarantees the reduction of carbon emissions, offering traceability and trust. These certificates are green tokens that represent economic value and can be exchanged for digital assets." },
  "hero.cta":          { es: "Comenzar gratis", en: "Get started" },
  "hero.cta2":         { es: "Ver proyectos", en: "See projects" },
  "common.save":       { es: "Guardar", en: "Save" },
  "common.cancel":     { es: "Cancelar", en: "Cancel" },
  "common.accept":     { es: "Aceptar", en: "Accept" },
  "common.email":      { es: "Correo electrónico", en: "Email" },
  "common.password":   { es: "Contraseña", en: "Password" },
  "common.loading":    { es: "Cargando…", en: "Loading…" },
  "contact.title":     { es: "Contacto", en: "Contact" },
  "contact.discord.sub": { es: "Únete a nuestra comunidad oficial en Discord. Allí podrás conversar con nuestro equipo y recibir soporte en tiempo real.", en: "Join our official Discord community. There you can chat with our team and get real-time support." },
  "contact.discord.cta": { es: "Unirse al servidor de Discord", en: "Join Discord server" },
  "contact.discord.hint": { es: "El enlace permite registrarse e ingresar directamente al servidor.", en: "The invite lets you register and join the server directly." },
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
