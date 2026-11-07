import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext, useRouter, HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { NetworkProvider } from "@/lib/network";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import logo from "@/assets/bio-tokens-logo.png.asset.json";

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "root" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Reintentar
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bio Tokens" },
      { name: "description", content: "Plataforma de certificación blockchain para la reducción de emisiones de carbono" },
      { name: "author", content: "Bio Tokens" },
      { property: "og:title", content: "Bio Tokens" },
      { property: "og:description", content: "Plataforma de certificación blockchain para la reducción de emisiones de carbono" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Bio Tokens" },
      { name: "twitter:description", content: "Plataforma de certificación blockchain para la reducción de emisiones de carbono" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/33HJ84Gx10bc0Dqbc2iQNHQANFS2/social-images/social-1780500466537-Copilot_20260527_114718.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/33HJ84Gx10bc0Dqbc2iQNHQANFS2/social-images/social-1780500466537-Copilot_20260527_114718.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: logo.url },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center"><p>404 — página no encontrada</p></div>
  ),
  errorComponent: (p) => <ErrorComponent error={p.error as Error} reset={p.reset} />,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <NetworkProvider>
              <div className="flex min-h-screen flex-col">
                <Header />
                <main className="flex-1"><Outlet /></main>
                <Footer />
                <Toaster />
              </div>
            </NetworkProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
