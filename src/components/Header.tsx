import { Link, useRouter } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Globe, Wallet, LogOut, Menu } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const navItems = [
    { to: "/proyectos", label: t("nav.projects") },
    { to: "/como-funciona", label: t("nav.how") },
    { to: "/ods", label: t("nav.sdg") },
    { to: "/precios", label: t("nav.pricing") },
    { to: "/contacto", label: t("nav.contact") },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center" aria-label="Bio Tokens">
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Principal">
          {navItems.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
              {it.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            aria-label="Cambiar idioma"
            title={lang === "es" ? "Switch to English" : "Cambiar a español"}
          >
            <Globe className="h-4 w-4" />
            <span className="ml-1 text-xs font-semibold uppercase">{lang}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Cambiar tema">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                  {user.email?.split("@")[0]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.navigate({ to: "/dashboard" })}>
                  {t("nav.dashboard")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.navigate({ to: "/wallet" })}>
                  <Wallet className="h-4 w-4 mr-2" /> {t("nav.wallet")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { await signOut(); router.navigate({ to: "/" }); }}>
                  <LogOut className="h-4 w-4 mr-2" /> {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">{t("nav.login")}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">{t("nav.signup")}</Link>
              </Button>
            </div>
          )}

          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menú">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {navItems.map((it) => (
                <DropdownMenuItem key={it.to} onClick={() => router.navigate({ to: it.to })}>
                  {it.label}
                </DropdownMenuItem>
              ))}
              {!user && (
                <>
                  <DropdownMenuItem onClick={() => router.navigate({ to: "/login" })}>{t("nav.login")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.navigate({ to: "/signup" })}>{t("nav.signup")}</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
