import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyWallet, getStellarBalance, getStellarHistory, saveWalletPublicKey, fundTestnet, USDC_ISSUER_MAINNET } from "@/lib/stellar.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { connectedWalletKey } from "@/lib/wallet-state";
import { connectVarialWallet } from "@/lib/varial-wallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNetwork } from "@/lib/network";
import { Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, Repeat, ArrowLeftRight, Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [
    { title: "Billetera Stellar — Bio Tokens" },
    { name: "description", content: "Conecta y desconecta tu billetera Stellar en Bio Tokens y consulta saldos e historial." },
    { property: "og:title", content: "Billetera Stellar — Bio Tokens" },
    { property: "og:description", content: "Gestiona la conexión de tu billetera Stellar y consulta su actividad en Bio Tokens." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: WalletPage,
});

function WalletPage() {
  const fnWallet = useServerFn(getMyWallet);
  const fnBalance = useServerFn(getStellarBalance);
  const fnHistory = useServerFn(getStellarHistory);
  const fnSave = useServerFn(saveWalletPublicKey);
  const fnFund = useServerFn(fundTestnet);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const walletQueryKey = ["my-wallet", user?.id];
  const wq = useQuery({ queryKey: walletQueryKey, queryFn: () => fnWallet(), enabled: !!user });
  const { network, setNetwork } = useNetwork();
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectingVarial, setConnectingVarial] = useState(false);
  const [varialError, setVarialError] = useState("");

  const activePk = connectedWalletKey(wq.data?.stellar_public_key) ?? "";
  const bq = useQuery({
    queryKey: ["bal", activePk, network],
    queryFn: () => fnBalance({ data: { publicKey: activePk, network } }),
    enabled: !!activePk,
  });
  const hq = useQuery({
    queryKey: ["hist", activePk, network],
    queryFn: () => fnHistory({ data: { publicKey: activePk, network, limit: 20 } }),
    enabled: !!activePk,
  });

  const connectVarial = async () => {
    setConnectingVarial(true);
    setVarialError("");
    try {
      const connection = await connectVarialWallet(network);
      const wallet = await fnSave({ data: connection });
      queryClient.setQueryData(walletQueryKey, wallet);
      setSecret("");
      setShowSecret(false);
      toast.success("Varial conectada");
      await queryClient.invalidateQueries({ queryKey: walletQueryKey });
    } catch (error) {
      setVarialError(error instanceof Error ? error.message : "No se pudo conectar Varial. Intenta nuevamente.");
    } finally {
      setConnectingVarial(false);
    }
  };

  const connect = async () => {
    if (!/^S[A-Z2-7]{55}$/.test(secret)) { toast.error("Clave secreta inválida (debe empezar con S y tener 56 caracteres)"); return; }
    setConnecting(true);
    try {
      const { Keypair } = await import("@stellar/stellar-sdk");
      let publicKey: string;
      try {
        publicKey = Keypair.fromSecret(secret).publicKey();
      } catch {
        toast.error("Clave secreta Stellar inválida");
        return;
      }
      const wallet = await fnSave({ data: { publicKey, network } });
      queryClient.setQueryData(walletQueryKey, wallet);
      setSecret("");
      setShowSecret(false);
      setVarialError("");
      toast.success("Billetera conectada. Tu clave secreta no se envió al servidor.");
      await queryClient.invalidateQueries({ queryKey: walletQueryKey });
    } catch {
      toast.error("No se pudo conectar la billetera. Intenta nuevamente.");
    } finally {
      setConnecting(false);
    }
  };
  const disconnect = async () => {
    setDisconnecting(true);
    try {
      const wallet = await fnSave({ data: { publicKey: null, network } });
      queryClient.setQueryData(walletQueryKey, wallet);
      // Revoke this site's access only when Varial owns the active address.
      try {
        const varial = await import("@stellar/varial-sdk");
        const installed = await varial.isConnected();
        if (installed.isConnected && !installed.error) {
          const account = await varial.getAddress();
          if (!account.error && account.address === activePk) {
            const result = await varial.disconnect();
            if (result.error) toast.warning("Desconectada de Bio Tokens. Revisa los permisos del sitio en Varial.");
          }
        }
      } catch {
        toast.warning("Desconectada de Bio Tokens. Revisa los permisos del sitio en Varial.");
      }
      setSecret("");
      setShowSecret(false);
      toast.success("Billetera desconectada");
      await queryClient.invalidateQueries({ queryKey: walletQueryKey });
    } catch {
      toast.error("No se pudo desconectar la billetera. Intenta nuevamente.");
    } finally {
      setDisconnecting(false);
    }
  };

  const fund = async () => {
    if (!activePk) return;
    await fnFund({ data: { publicKey: activePk } });
    toast.success("Cuenta financiada en testnet");
    bq.refetch();
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-3xl font-bold flex items-center gap-2"><WalletIcon className="h-7 w-7" /> Billetera Stellar</h1>

      <div className="flex items-center gap-2 mt-4">
        <Button variant={network === "testnet" ? "default" : "outline"} size="sm" onClick={() => setNetwork("testnet")}>Testnet</Button>
        <Button variant={network === "mainnet" ? "default" : "outline"} size="sm" onClick={() => setNetwork("mainnet")}>Mainnet</Button>
      </div>

      {wq.isPending ? <p className="mt-6 text-muted-foreground">Cargando billetera…</p> : wq.isError ? (
        <div className="mt-6"><p role="alert">No se pudo consultar la billetera.</p><Button variant="outline" onClick={() => wq.refetch()}>Reintentar</Button></div>
      ) : !activePk ? (
        <Card className="p-6 mt-6">
          <h2 className="font-semibold">Conectar billetera</h2>
          <Button className="mt-4" onClick={connectVarial} disabled={connectingVarial || connecting}>
            <WalletIcon className="mr-2 h-4 w-4" />{connectingVarial ? "Esperando a Varial…" : "Conectar Varial"}
          </Button>
          {varialError && <p role="alert" className="mt-3 text-sm text-destructive">{varialError}</p>}
          <h3 className="mt-6 font-medium text-sm">Importar con clave secreta</h3>
          <p className="text-sm text-muted-foreground">
            Pega tu clave secreta Stellar (empieza con S…). Tu clave secreta se procesa solo en tu navegador para derivar la dirección pública; nunca se envía ni guarda en el servidor.
          </p>
          <form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); if (!connecting && !connectingVarial) void connect(); }}>
            <Input
              type={showSecret ? "text" : "password"}
              aria-label="Clave secreta Stellar"
              className="min-w-0 flex-1 basis-full sm:basis-0"
              autoComplete="off"
              spellCheck={false}
              placeholder="SA… (clave secreta)"
              value={secret}
              onChange={(e) => setSecret(e.target.value.trim())}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => setShowSecret((v) => !v)}>
              {showSecret ? "Ocultar" : "Mostrar"}
            </Button>
            <Button type="submit" disabled={connecting || connectingVarial}>{connecting ? "Conectando…" : "Conectar"}</Button>
          </form>
        </Card>
      ) : (
        <>
          <Card className="p-6 mt-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs text-muted-foreground">Dirección activa ({network})</div>
                <div className="font-mono text-sm break-all">{activePk}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(activePk); toast.success("Copiada"); }}>
                  <Copy className="h-4 w-4 mr-1" /> Copiar
                </Button>
                {network === "testnet" && <Button size="sm" variant="outline" onClick={fund}>Financiar testnet</Button>}
                <Button size="sm" variant="ghost" onClick={disconnect} disabled={disconnecting}>{disconnecting ? "Desconectando…" : "Desconectar"}</Button>
              </div>
            </div>
          </Card>

          <div className="grid sm:grid-cols-4 gap-2 mt-4">
            {[{ i: ArrowDownToLine, l: "Recibir" }, { i: ArrowUpFromLine, l: "Enviar" }, { i: Repeat, l: "Intercambiar" }, { i: ArrowLeftRight, l: "Puente" }].map((a) => (
              <Button key={a.l} variant="outline" className="h-16 flex-col gap-1"><a.i className="h-4 w-4" />{a.l}</Button>
            ))}
          </div>

          <Tabs defaultValue="bal" className="mt-6">
            <TabsList><TabsTrigger value="bal">Saldo</TabsTrigger><TabsTrigger value="hist">Historial</TabsTrigger><TabsTrigger value="trust">Trustline USDC</TabsTrigger></TabsList>
            <TabsContent value="bal">
              <Card className="p-4">
                {bq.isLoading ? <p>Cargando…</p> : !bq.data?.exists ? <p className="text-muted-foreground">Cuenta no encontrada en {network}.</p> : (
                  <ul className="divide-y">
                    {bq.data.balances.map((b, i) => (
                      <li key={i} className="py-2 flex justify-between"><span className="font-mono">{b.asset}</span><span className="font-semibold">{Number(b.balance).toLocaleString()}</span></li>
                    ))}
                  </ul>
                )}
              </Card>
            </TabsContent>
            <TabsContent value="hist">
              <Card className="p-4">
                {hq.isLoading ? <p>Cargando…</p> : (
                  <ul className="divide-y">
                    {(hq.data?.records ?? []).map((r) => (
                      <li key={r.id} className="py-2 text-sm flex justify-between gap-2">
                        <span className="capitalize">{r.type}</span>
                        <span>{r.amount ? `${r.amount} ${r.asset_code ?? "XLM"}` : "—"}</span>
                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                      </li>
                    ))}
                    {(hq.data?.records ?? []).length === 0 && <p className="text-muted-foreground">Sin movimientos.</p>}
                  </ul>
                )}
              </Card>
            </TabsContent>
            <TabsContent value="trust">
              <Card className="p-4 text-sm">
                <p className="font-semibold">USDC Mainnet trustline</p>
                <p className="text-muted-foreground mt-1">Emisor:</p>
                <p className="font-mono text-xs break-all">{USDC_ISSUER_MAINNET}</p>
                <p className="text-xs text-muted-foreground mt-2">Activa la línea de confianza desde tu billetera Stellar (p. ej. Freighter o Lobstr) para recibir USDC en mainnet.</p>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
