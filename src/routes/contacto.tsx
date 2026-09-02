import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import discordAsset from "@/assets/discord-logo.png.asset.json";

export const Route = createFileRoute("/contacto")({
  head: () => ({
    meta: [
      { title: "Contacto — Bio Tokens" },
      { name: "description", content: "Únete a la comunidad de Bio Tokens en Discord." },
      { property: "og:title", content: "Contacto — Bio Tokens" },
      { property: "og:description", content: "Comunidad oficial de Bio Tokens en Discord." },
    ],
  }),
  component: Contacto,
});

const DISCORD_INVITE_URL = "https://discord.gg/R8jTDTAXvX";

function Contacto() {
  const { t } = useI18n();
  return (
    <div className="container mx-auto px-4 py-12 max-w-xl text-center">
      <h1 className="text-4xl font-bold">{t("contact.title")}</h1>
      <Card className="p-8 mt-6 flex flex-col items-center gap-6">
        <a
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("contact.discord.cta")}
        >
          <img
            src={discordAsset.url}
            alt="Discord"
            className="w-32 h-32 object-contain rounded-2xl"
          />
        </a>
        <p className="text-lg text-muted-foreground max-w-sm">
          {t("contact.discord.sub")}
        </p>
        <Button asChild size="lg" className="w-full max-w-xs">
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("contact.discord.cta")}
          >
            {t("contact.discord.cta")}
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">
          {t("contact.discord.hint")}
        </p>
      </Card>
    </div>
  );
}
