import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SDG_INFO, SECTORS } from "@/lib/sectors";
import type { Sector } from "@/lib/sectors";
import { Download } from "lucide-react";

export const Route = createFileRoute("/ods")({
  head: () => ({
    meta: [
      { title: "ODS — Bio Tokens" },
      { name: "description", content: "Alineación con los Objetivos de Desarrollo Sostenible 2, 6, 7, 11, 12, 13 y 15." },
      { property: "og:title", content: "ODS soportados — Bio Tokens" },
      { property: "og:description", content: "Mapeo automático sector ↔ ODS con contadores dinámicos." },
    ],
  }),
  component: Ods,
});

function Ods() {
  const downloadCsv = () => {
    const rows = [["ODS", "Nombre", "Sectores"]];
    Object.entries(SDG_INFO).forEach(([code, info]) => {
      const sectors = (Object.entries(SECTORS) as [Sector, typeof SECTORS[Sector]][])
        .filter(([, s]) => s.sdgs.includes(Number(code)))
        .map(([, s]) => s.es).join(" / ");
      rows.push([code, info.es, sectors]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "bio-tokens-ods.csv"; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-4xl font-bold">Objetivos de Desarrollo Sostenible</h1>
        <Button variant="outline" onClick={downloadCsv}><Download className="h-4 w-4 mr-2" />Descargar CSV</Button>
      </div>
      <p className="text-muted-foreground mt-2">Cada sector se alinea automáticamente con los ODS correspondientes y alimenta contadores dinámicos.</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {Object.entries(SDG_INFO).map(([code, info]) => (
          <Card key={code} className="p-5 border-l-4" style={{ borderLeftColor: info.color }}>
            <div className="text-xs font-bold" style={{ color: info.color }}>ODS {code}</div>
            <h3 className="font-semibold mt-1">{info.es}</h3>
            <div className="mt-3 flex flex-wrap gap-1">
              {(Object.entries(SECTORS) as [Sector, typeof SECTORS[Sector]][])
                .filter(([, s]) => s.sdgs.includes(Number(code)))
                .map(([k, s]) => <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-muted">{s.es}</span>)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
