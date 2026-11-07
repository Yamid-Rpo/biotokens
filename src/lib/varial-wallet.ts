import { walletConnectionSchema } from "./wallet-state";

type VarialApi = Pick<typeof import("@stellar/varial-sdk"), "isConnected" | "requestAccess" | "getNetwork">;

// Load the extension bridge only after a browser interaction, never during SSR.
export async function connectVarialWallet(
  network: "testnet" | "mainnet",
  api?: VarialApi,
) {
  const walletApi = api ?? await import("@stellar/varial-sdk");
  const installed = await walletApi.isConnected();
  if (installed.error || !installed.isConnected) {
    throw new Error("Varial no está disponible. Instala o desbloquea la extensión y vuelve a intentarlo.");
  }
  const access = await walletApi.requestAccess();
  if (access.error || !access.address) {
    throw new Error("Conexión no autorizada en Varial. Acepta la solicitud para conectar tu billetera.");
  }
  const selected = await walletApi.getNetwork();
  if (selected.error) throw new Error("No se pudo consultar la red de Varial. Intenta nuevamente.");
  const expectedPassphrase = network === "testnet"
    ? "Test SDF Network ; September 2015"
    : "Public Global Stellar Network ; September 2015";
  if (selected.networkPassphrase !== expectedPassphrase) {
    throw new Error(`Cambia la red de Varial a ${network === "testnet" ? "Testnet" : "Mainnet"} y vuelve a conectar.`);
  }
  const connection = walletConnectionSchema.safeParse({ publicKey: access.address, network });
  if (!connection.success) throw new Error("Varial devolvió una dirección Stellar inválida.");
  return connection.data;
}