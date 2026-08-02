import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  const links = [
    { to: "/contacto", label: t("nav.contact") },
    { to: "/como-funciona", label: t("nav.how") },
    { to: "/terminos", label: t("nav.terms") },
    { to: "/privacidad", label: t("nav.privacy") },
  ];

  return (
    <footer className="border-t mt-16">
      <div className="container mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <Logo size={28} />
        <nav aria-label="Enlaces legales" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p>© {new Date().getFullYear()} Bio Tokens.</p>
      </div>
    </footer>
  );
}
