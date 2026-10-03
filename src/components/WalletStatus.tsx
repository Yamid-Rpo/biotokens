import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Wallet } from "lucide-react";
import { getMyWallet } from "@/lib/stellar.functions";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export function WalletStatus() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const fnWallet = useServerFn(getMyWallet);
  const wq = useQuery({
    queryKey: ["my-wallet"],
    queryFn: () => fnWallet(),
    enabled: !!user,
  });

  if (!user) return null;
  const connected = !!wq.data?.stellar_public_key;
  const label = connected
    ? lang === "es" ? "Conectada" : "Connected"
    : lang === "es" ? "Desconectada" : "Disconnected";

  return (
    <Link
      to="/wallet"
      title={lang === "es" ? "Estado de la billetera" : "Wallet status"}
      aria-label={`${lang === "es" ? "Billetera" : "Wallet"}: ${label}`}
      className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-muted-foreground/40"}`} />
      <Wallet className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
