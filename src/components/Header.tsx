import { Link, useRouter } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useNetwork } from "@/lib/network";
import { WalletStatus } from "./WalletStatus";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Globe, Wallet, LogOut, Menu, Bot, ShieldCheck } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { network, setNetwork } = useNetwork();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const navItems = [
    { to: "/proyectos", label: t("nav.projects") },
    { to: "/ods", label: t("nav.sdg") },
    { to: "/contacto", label: t("nav.contact") },
    { to: "/como-funciona", label: t("nav.how") },
    { to: "/terminos", label: t("nav.terms") },
    { to: "/privacidad", label: t("nav.privacy") },
  ];

  const publicItems: { to: string; label: string }[] = [
    { to: "/contacto", label: t("nav.contact") },
    { to: "/como-funciona", label: t("nav.how") },
    { to: "/terminos", label: t("nav.terms") },
    { to: "/privacidad", label: t("nav.privacy") },
  ];

  const loggedItems: { to: string; label: string }[] = [
    { to: "/dashboard", label: t("nav.dashboard") },
    { to: "/proyectos", label: t("nav.projects") },
    { to: "/ods", label: t("nav.sdg") },
    { to: "/wallet", label: t("nav.wallet") },
  ];

  const confirmLogout = async () => {
    setLogoutOpen(false);
    await signOut();
    router.navigate({ to: "/" });
  };



  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center" aria-label="Bio Tokens">
          <Logo />
        </Link>

        <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-5 text-sm">
          {(user ? loggedItems : publicItems).map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className="text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              {it.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <div role="group" aria-label="Red Stellar" className="flex items-center rounded-md border p-0.5 text-xs mr-1">
            {(["testnet", "mainnet"] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNetwork(n)}
                aria-pressed={network === n}
                title={`Red Stellar: ${n === "testnet" ? "Testnet" : "Mainnet"}`}
                className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
                  network === n ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {network === n && (
                  <span className={`h-1.5 w-1.5 rounded-full ${n === "mainnet" ? "bg-destructive" : "bg-primary-foreground"}`} />
                )}
                {n === "testnet" ? "Testnet" : "Mainnet"}
              </button>
            ))}
          </div>


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

          <WalletStatus />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {user.email?.split("@")[0]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.navigate({ to: "/dashboard" })}>
                  {t("nav.dashboard")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {navItems.map((it) => (
                  <DropdownMenuItem key={it.to} onClick={() => router.navigate({ to: it.to })}>
                    {it.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.navigate({ to: "/wallet" })}>
                  <Wallet className="h-4 w-4 mr-2" /> {t("nav.wallet")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.navigate({ to: "/seguridad" })}>
                  <ShieldCheck className="h-4 w-4 mr-2" /> {lang === "es" ? "Seguridad" : "Security"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.navigate({ to: "/connect" })}>
                  <Bot className="h-4 w-4 mr-2" /> {t("nav.connect")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLogoutOpen(true)}>
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
              {!user && (
                <>
                  <DropdownMenuItem onClick={() => router.navigate({ to: "/login" })}>{t("nav.login")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.navigate({ to: "/signup" })}>{t("nav.signup")}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {(user ? loggedItems : publicItems).map((it) => (
                <DropdownMenuItem key={it.to} onClick={() => router.navigate({ to: it.to })}>
                  {it.label}
                </DropdownMenuItem>
              ))}

            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("logout.confirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("logout.confirm.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout}>{t("logout.confirm.accept")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
