import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type StellarNetwork = "testnet" | "mainnet";

const Ctx = createContext<{ network: StellarNetwork; setNetwork: (n: StellarNetwork) => void }>({
  network: "testnet",
  setNetwork: () => {},
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<StellarNetwork>("testnet");
  useEffect(() => {
    const saved = localStorage.getItem("bt-network");
    if (saved === "mainnet" || saved === "testnet") setNetworkState(saved);
  }, []);
  const setNetwork = (n: StellarNetwork) => {
    setNetworkState(n);
    localStorage.setItem("bt-network", n);
  };
  return <Ctx.Provider value={{ network, setNetwork }}>{children}</Ctx.Provider>;
}

export const useNetwork = () => useContext(Ctx);
