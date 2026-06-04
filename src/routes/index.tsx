import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { SECTORS, SDG_INFO } from "@/lib/sectors";
import { Leaf, Zap, Droplets, Recycle, Car, Wind, TreePine, ArrowRight, ShieldCheck, Coins, Globe2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bio Tokens — Certificados de impacto ambiental" },
      { name: "description", content: "Convierte impacto ambiental real en certificados blockchain intercambiables por activos digitales." },
      { property: "og:title", content: "Bio Tokens" },
      { property: "og:description", content: "Certificación blockchain de impacto ambiental." },
    ],
  }),
  component: Home,
});

const sectorIcon: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  forestal: TreePine, agricola: Leaf, energia_limpia: Zap,
  movilidad_electrica: Car, recuperacion_agua: Droplets,
  transformacion_residuos: Recycle, captura_co2: Wind,
};

function Home() {
  const { t, lang } = useI18n();
  return (
    <div>
      <section className="bio-gradient">
        <div className="container mx-auto px-4 py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto">
            <span className="bio-text-gradient">{t("hero.title")}</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">{t("hero.sub")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/signup">{t("hero.cta")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/proyectos">{t("hero.cta2")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: ShieldCheck, t: lang === "es" ? "Verificación auditable" : "Auditable verification", d: lang === "es" ? "Cada certificado se ancla en una red blockchain y permite auditar en tiempo real los tokens emitidos." : "Every certificate is anchored on a blockchain network and allows real-time auditing of issued tokens." },
            { icon: Coins, t: lang === "es" ? "Intercambia activos" : "Exchange assets", d: lang === "es" ? "Intercambio integrado; puente automático entre activos digitales." : "Integrated exchange; automatic bridge between digital assets." },
            { icon: Globe2, t: lang === "es" ? "Alineado a ODS" : "SDG-aligned", d: lang === "es" ? "Mapeo automático con ODS: 2, 6, 7, 11, 12, 13 y 15. Acompañando a empresas en la medición con reportes verificados de su huella de carbono." : "Automatic mapping with SDGs: 2, 6, 7, 11, 12, 13 and 15. Supporting companies in measurement with verified carbon footprint reports." },
          ].map((f) => (
            <Card key={f.t} className="p-6">
              <f.icon className="h-8 w-8" style={{ color: "var(--leaf)" }} />
              <h3 className="mt-4 text-lg font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold tracking-tight">{lang === "es" ? "Sectores de impacto" : "Impact sectors"}</h2>
        <p className="text-muted-foreground mt-2">{lang === "es" ? "Un tipo de token por sector con unidad de medida específica." : "One token type per sector with a specific unit."}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {Object.entries(SECTORS).map(([key, s]) => {
            const Icon = sectorIcon[key] ?? Leaf;
            return (
              <Card key={key} className="p-5 transition-shadow hover:shadow-lg">
                <Icon className="h-6 w-6" style={{ color: "var(--circuit)" }} />
                <h3 className="mt-3 font-semibold">{s[lang]}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{s.assetCode}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {s.sdgs.map((n) => (
                    <span key={n} className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: SDG_INFO[n].color }}>
                      ODS {n}
                    </span>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
