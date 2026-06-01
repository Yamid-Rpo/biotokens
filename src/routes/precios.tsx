import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const Route = createFileRoute("/precios")({
  head: () => ({
    meta: [
      { title: "Precios — Bio Tokens" },
      { name: "description", content: "Planes para personas y empresas que certifican impacto ambiental." },
      { property: "og:title", content: "Precios Bio Tokens" },
      { property: "og:description", content: "Planes flexibles para personas y empresas." },
    ],
  }),
  component: Precios,
});

function Precios() {
  const plans = [
    { name: "Persona", price: "Gratis", features: ["1 proyecto", "Wallet Stellar", "Testnet ilimitado", "ODS automáticos"] },
    { name: "Empresa", price: "Desde 49 USD/mes", features: ["Proyectos ilimitados", "Mainnet + USDC", "Verificación prioritaria", "Reportes ODS"], featured: true },
    { name: "Enterprise", price: "A medida", features: ["SLA dedicado", "Verificadores propios", "Smart contracts a medida", "Integración API"] },
  ];
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center">Precios</h1>
      <p className="text-muted-foreground mt-2 text-center">Empieza gratis, escala cuando lo necesites.</p>
      <div className="grid md:grid-cols-3 gap-4 mt-10">
        {plans.map((p) => (
          <Card key={p.name} className={`p-6 ${p.featured ? "ring-2 ring-primary" : ""}`}>
            <h3 className="font-semibold text-lg">{p.name}</h3>
            <div className="text-3xl font-bold mt-2">{p.price}</div>
            <ul className="mt-4 space-y-2 text-sm">
              {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-primary" /> {f}</li>)}
            </ul>
            <Button className="w-full mt-6" variant={p.featured ? "default" : "outline"}>Elegir</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
