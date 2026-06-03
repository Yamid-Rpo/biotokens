import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyWallet, getStellarBalance, getStellarHistory, saveWalletPublicKey, fundTestnet, USDC_ISSUER_MAINNET } from "@/lib/stellar.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, Repeat, ArrowLeftRight, Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Billetera — Bio Tokens" }] }),
  component: WalletPage,
});

function WalletPage() {
  const fnWallet = useServerFn(getMyWallet);
  const fnBalance = useServerFn(getStellarBalance);
  const fnHistory = useServerFn(getStellarHistory);
  const fnSave = useServerFn(saveWalletPublicKey);
  const fnFund = useServerFn(fundTestnet);

  const wq = useQuery({ queryKey: ["my-wallet"], queryFn: () => fnWallet() });
  const [network, setNetwork] = useState<"testnet" | "mainnet">("testnet");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const activePk = wq.data?.stellar_public_key ?? "";
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

  const connect = async () => {
    if (!/^S[A-Z2-7]{55}$/.test(secret)) { toast.error("Clave secreta inválida (debe empezar con S y tener 56 caracteres)"); return; }
    setConnecting(true);
    try {
      const { Keypair } = await import("@stellar/stellar-sdk");
      const publicKey = Keypair.fromSecret(secret).publicKey();
      await fnSave({ data: { publicKey, network } });
      setSecret("");
      toast.success("Billetera conectada. Tu clave secreta no se envió al servidor.");
      wq.refetch();
    } catch {
      toast.error("No se pudo derivar la clave pública desde la clave secreta");
    } finally {
      setConnecting(false);
    }
  };
  const disconnect = async () => {
    await fnSave({ data: { publicKey: "G" + "A".repeat(55) as never, network } });
    toast.message("Para desconectar definitivamente, reemplaza con otra clave.");
    wq.refetch();
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

      {!activePk ? (
        <Card className="p-6 mt-6">
          <h2 className="font-semibold">Conectar billetera</h2>
          <p className="text-sm text-muted-foreground">
            Pega tu clave secreta Stellar (empieza con S…). Tu clave secreta se procesa solo en tu navegador para derivar la dirección pública; nunca se envía ni guarda en el servidor.
          </p>
          <div className="mt-4 flex gap-2">
            <Input
              type={showSecret ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              placeholder="SA… (clave secreta)"
              value={secret}
              onChange={(e) => setSecret(e.target.value.trim())}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => setShowSecret((v) => !v)}>
              {showSecret ? "Ocultar" : "Mostrar"}
            </Button>
            <Button onClick={connect} disabled={connecting}>{connecting ? "Conectando…" : "Conectar"}</Button>
          </div>
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
                <Button size="sm" variant="ghost" onClick={disconnect}>Desconectar</Button>
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
