import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Cómo funciona — Bio Tokens" },
      { name: "description", content: "Del registro ambiental al certificado intercambiable en cuatro pasos." },
      { property: "og:title", content: "Cómo funciona Bio Tokens" },
      { property: "og:description", content: "Registro, verificación, tokenización e intercambio." },
    ],
  }),
  component: How,
});

function How() {
  const steps = [
    { n: 1, t: "Registra tu proyecto", d: "Describe el sector, ubicación e impacto esperado." },
    { n: 2, t: "Sube registros con evidencia", d: "Cantidades medidas (m², kWh, kg, L) con archivos de soporte." },
    { n: 3, t: "Verificación y emisión", d: "Verificadores aprueban; el smart contract emite certificados Stellar." },
    { n: 4, t: "Intercambia por XLM o USDC", d: "Recibe, envía, intercambia y usa el puente automático." },
  ];
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold">Cómo funciona</h1>
      <div className="grid md:grid-cols-2 gap-4 mt-8">
        {steps.map((s) => (
          <Card key={s.n} className="p-6">
            <div className="text-4xl font-bold bio-text-gradient">{s.n}</div>
            <h3 className="mt-2 font-semibold">{s.t}</h3>
            <p className="text-sm text-muted-foreground mt-1">{s.d}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
