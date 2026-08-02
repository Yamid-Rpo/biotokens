import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Bot,
  Terminal,
  ExternalLink,
  PlugZap,
  Loader2,
  CircleAlert,
  CircleCheck,
} from "lucide-react";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Conectar agente de IA — Bio Tokens" },
      { name: "description", content: "Conecta ChatGPT, Claude o cualquier cliente MCP a Bio Tokens." },
      { property: "og:title", content: "Conectar agente de IA — Bio Tokens" },
      { property: "og:description", content: "Conecta ChatGPT, Claude o cualquier cliente MCP a Bio Tokens." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectPage,
});

function normalizeSlug(name: string): string {
  const ascii = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const slug = ascii.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) return "lovable-app";
  const capped = slug.slice(0, 63);
  const reserved = new Set(["workspace", "computer-use", "claude-in-chrome", "claude-preview", "claude-browser"]);
  return reserved.has(capped) ? `${capped}-app` : capped;
}

function useMcpUrl(): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(new URL("/mcp", window.location.origin).toString());
  }, []);
  return url;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copiado al portapapeles`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={onCopy} className="shrink-0 gap-1">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {n}
      </span>
      <div className="text-sm leading-relaxed text-foreground">{children}</div>
    </li>
  );
}

type ToolInfo = { name: string; title?: string; description?: string };
type TestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; tools: ToolInfo[] }
  | { status: "error"; message: string };

function TestConnectionCard({ mcpUrl }: { mcpUrl: string | null }) {
  const [token, setToken] = useState("");
  const [state, setState] = useState<TestState>({ status: "idle" });

  const runTest = async () => {
    if (!mcpUrl) return;
    setState({ status: "loading" });
    try {
      const res = await fetch(mcpUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          ...(token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}),
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      });

      if (res.status === 401 || res.status === 403) {
        setState({
          status: "error",
          message: token.trim()
            ? "El token no es válido o expiró. Usa un token de acceso emitido por el flujo OAuth del cliente MCP (no la sesión web)."
            : "El servidor MCP requiere autenticación. Pega un token de acceso OAuth para probar la conexión.",
        });
        return;
      }

      const raw = await res.text();
      // La respuesta puede llegar como JSON o como evento SSE (data: {...}).
      const jsonText = raw.includes("data:")
        ? (raw.split("\n").find((l) => l.startsWith("data:")) ?? "").slice(5).trim()
        : raw;
      const payload = JSON.parse(jsonText) as {
        result?: { tools?: ToolInfo[] };
        error?: { message?: string };
      };

      if (payload.error) {
        setState({ status: "error", message: payload.error.message ?? "Error del servidor MCP." });
        return;
      }

      const tools = payload.result?.tools ?? [];
      setState({ status: "ok", tools });
      toast.success(`Conexión correcta — ${tools.length} herramientas disponibles`);
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "No se pudo contactar el servidor MCP.",
      });
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlugZap className="h-5 w-5 text-primary" />
          Probar conexión
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mcp-token">Token de acceso OAuth (opcional)</Label>
          <Input
            id="mcp-token"
            type="password"
            autoComplete="off"
            placeholder="Pega aquí el token emitido a tu cliente MCP"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runTest();
            }}
          />
          <p className="text-xs text-muted-foreground">
            El token se usa solo en tu navegador para esta prueba; no se guarda ni se envía a terceros.
          </p>
        </div>

        <Button onClick={() => void runTest()} disabled={!mcpUrl || state.status === "loading"} className="gap-2">
          {state.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
          {state.status === "loading" ? "Probando…" : "Probar conexión"}
        </Button>

        {state.status === "error" && (
          <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span>{state.message}</span>
          </div>
        )}

        {state.status === "ok" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <CircleCheck className="h-4 w-4" />
              Token válido — {state.tools.length} herramientas disponibles
            </div>
            <ul className="divide-y rounded-md border">
              {state.tools.map((tool) => (
                <li key={tool.name} className="p-3">
                  <p className="text-sm font-medium">{tool.title ?? tool.name}</p>
                  <code className="text-xs text-muted-foreground">{tool.name}</code>
                  {tool.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function ConnectPage() {
  const mcpUrl = useMcpUrl();
  const appSlug = normalizeSlug("Bio Tokens");
  const claudeCodeCommand = mcpUrl
    ? `claude mcp add --scope user --transport http ${appSlug} '${mcpUrl.replace(/'/g, "'\\''")}'`
    : "";
  const claudePrefilledUrl = mcpUrl
    ? `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent(
        "Bio Tokens"
      )}&connectorUrl=${encodeURIComponent(mcpUrl)}`
    : "#";

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Conectar un agente de IA</h1>
        <p className="mt-2 text-muted-foreground">
          Usa Bio Tokens desde ChatGPT, Claude, Claude Code u otro cliente MCP.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            URL del servidor MCP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded-md bg-muted px-3 py-2 text-sm">
              {mcpUrl ?? "Cargando…"}
            </code>
            {mcpUrl && <CopyButton value={mcpUrl} label="URL" />}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Copia esta dirección y pégala en tu asistente. La URL se adapta automáticamente al dominio desde el que accedas (preview, publicación o dominio personalizado).
          </p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ChatGPT</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              <Step n={1}>
                Abre{" "}
                <a
                  href="https://chatgpt.com/#settings/Connectors/Advanced"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  Configuración avanzada de conectores <ExternalLink className="h-3 w-3" />
                </a>{" "}
                y activa el modo desarrollador si aún no lo has hecho.
              </Step>
              <Step n={2}>Haz clic en "Crear app".</Step>
              <Step n={3}>Escribe un nombre (por ejemplo, "Bio Tokens") y pega la URL del servidor MCP.</Step>
              <Step n={4}>Haz clic en "Crear".</Step>
              <Step n={5}>Activa la app desde el compositor de chat y pídele que use Bio Tokens.</Step>
            </ol>
            <div className="mt-6 rounded-md bg-muted p-4">
              <h4 className="mb-2 text-sm font-semibold">Actualizar después de cambios</h4>
              <p className="text-sm text-muted-foreground">
                En la configuración de la app, junto a "Información", haz clic en "Actualizar". Si la URL cambió, pégala de nuevo desde arriba.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Claude</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              <Step n={1}>
                Abre el{" "}
                <a
                  href={claudePrefilledUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  formulario de conector personalizado <ExternalLink className="h-3 w-3" />
                </a>{" "}
                (ya lleva el nombre y la URL rellenos).
              </Step>
              <Step n={2}>Revisa los datos y haz clic en "Agregar".</Step>
              <Step n={3}>Si el formulario no se abre, ve a Conectores en Claude, elige "Agregar conector personalizado" y pega la URL.</Step>
              <Step n={4}>Habilita el conector en el chat y pídele a Claude que use Bio Tokens.</Step>
            </ol>
            <div className="mt-6 rounded-md bg-muted p-4">
              <h4 className="mb-2 text-sm font-semibold">Actualizar después de cambios</h4>
              <p className="text-sm text-muted-foreground">
                Abre la página de Conectores, selecciona este conector y actualiza sus herramientas. Si la URL cambió, pégala de nuevo.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Claude Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              <Step n={1}>Copia el siguiente comando y ejecútalo en tu terminal.</Step>
            </ol>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
              <pre className="flex-1 overflow-x-auto rounded-md bg-muted p-3 text-xs">
                <code>{claudeCodeCommand}</code>
              </pre>
              {claudeCodeCommand && <CopyButton value={claudeCodeCommand} label="comando" />}
            </div>
            <ol className="mt-4 space-y-3" start={2}>
              <Step n={2}>Inicia Claude Code y ejecuta <code>/mcp</code> para confirmar que Bio Tokens aparece conectado.</Step>
              <Step n={3}>Pídele a Claude Code que use Bio Tokens.</Step>
            </ol>
            <div className="mt-6 rounded-md bg-muted p-4">
              <h4 className="mb-2 text-sm font-semibold">Actualizar después de cambios</h4>
              <p className="text-sm text-muted-foreground">
                Inicia una nueva sesión de Claude Code para recargar las herramientas. Si la URL cambió, ejecuta <code>claude mcp remove {appSlug}</code> y vuelve a ejecutar el comando de instalación.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Otros clientes MCP</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              <Step n={1}>Abre la configuración de servidores MCP del cliente.</Step>
              <Step n={2}>Crea una conexión a un servidor MCP remoto.</Step>
              <Step n={3}>Ponle un nombre (por ejemplo, "Bio Tokens") y pega la URL del servidor MCP.</Step>
              <Step n={4}>Completa el inicio de sesión o autorización si te lo pide.</Step>
              <Step n={5}>Habilita la conexión y pídele al asistente que use Bio Tokens.</Step>
            </ol>
            <div className="mt-6 rounded-md bg-muted p-4">
              <h4 className="mb-2 text-sm font-semibold">Actualizar después de cambios</h4>
              <p className="text-sm text-muted-foreground">
                En la configuración del servidor, selecciona la conexión de Bio Tokens y actualiza o recarga la lista de herramientas. Si la URL cambió, pégala de nuevo.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Los asistentes conectados actúan con tu sesión de Bio Tokens y respetan las mismas reglas de acceso (RLS) que la aplicación web.
      </p>
    </main>
  );
}
