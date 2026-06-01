# Bio Tokens — Plan de construcción

Plataforma de certificación blockchain (Stellar) para reducción de emisiones de carbono, con emisión de tokens por actividad ambiental, intercambio por XLM/USDC, alineación con ODS y panel para empresas y personas.

## Fase 1 — Fundaciones

- Activar **Lovable Cloud** (auth, DB, storage, functions).
- Sistema de diseño: paleta verde-azul inspirada en el logo (modo claro/oscuro), tokens en `src/styles.css` (oklch).
- Logo Bio Tokens subido como asset, usado en header, favicon y OG.
- i18n **ES/EN** con switcher persistente.
- Layout base: header con logo, nav dinámica, switch idioma, switch tema, botón conectar wallet.

## Fase 2 — Landing pública (presentación)

Rutas separadas con SEO propio (title/description/og por ruta):
- `/` Home (hero, valor, métricas reales del mercado de carbono).
- `/proyectos` catálogo público de proyectos certificados.
- `/como-funciona` flujo de emisión → verificación → tokenización → intercambio.
- `/ods` mapa de ODS soportados (2, 6, 7, 11, 12, 13, 15).
- `/precios` planes empresas / personas.
- `/contacto`.

## Fase 3 — Auth y roles

- Email/contraseña + recuperación + cambio de email.
- MFA (TOTP).
- HIBP password check activado.
- Tabla `user_roles` separada con enum (`admin`, `verifier`, `company`, `person`) y `has_role()` security-definer.
- Rutas `/admin/*` protegidas server-side.

## Fase 4 — Gestión de proyectos

Tabla `projects`: nombre, ubicación (lat/lng + país), descripción, sector (forestal, agrícola, energía limpia, movilidad eléctrica, recuperación de agua, transformación de residuos, captura CO₂), responsable, estado (borrador/en revisión/verificado/activo), evidencia.
- CRUD para empresas/personas dueñas.
- Vista admin para verificadores.
- Tarjetas clicables → detalle; navegación accesible con Enter.

## Fase 5 — Registros ambientales y ODS

Tabla `environmental_records` por proyecto con unidad dinámica según sector:
- m² reforestado, m² agrícola, kWh renovable, kg CO₂ reducido, L agua recuperada, kg residuos transformados.
- Contadores dinámicos en vivo.
- Mapeo automático sector → ODS (2/6/7/11/12/13/15).
- Exportar/importar documentación ODS (PDF + CSV).

## Fase 6 — Tokenización (Stellar)

Server functions con `@stellar/stellar-sdk`:
- Toggle **Mainnet / Testnet**.
- Conectar/desconectar wallet externa (Freighter) + importar wallet por **clave secreta** (cifrada en cliente, nunca persistida en servidor).
- Emisión de assets Stellar por tipo de certificado (BIOFOR, BIOAGR, BIOKWH, BIOCO2, BIOH2O, BIORES) — issuer cuenta Bio Tokens.
- Trustline **USDC Mainnet** `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`.
- Operaciones: **Recibir, Enviar, Intercambiar (path payment bidireccional XLM/USDC/BIO\*), Puente** (conversión auto).
- Saldo + historial de transacciones (Horizon).
- Validación de tokens antes de intercambiar.
- Smart contracts (Soroban) para emisión automatizada según `environmental_records` verificados.

## Fase 7 — Tarjeta virtual

- Emisión de tarjeta virtual ligada al saldo USDC para compras virtuales (PAN/CVV/exp mostrados solo al titular, congelar/descongelar).

## Fase 8 — Seguridad y observabilidad

- Logs server, métricas, analítica de uso, lago de datos (tabla `events`).
- Cifrado en reposo (Cloud) + cifrado de claves sensibles cliente-side.
- Agente IA de seguridad: monitorea transacciones, detecta patrones sospechosos, antifraude, alertas.
- RLS en todas las tablas; grants explícitos.
- Validación Zod en cada serverFn y ruta `/api/public/*`.

## Fase 9 — Agentes IA (Lovable AI Gateway)

- Asistente de navegación dinámica (chat con tools que rutean y crean proyectos).
- Agente verificador (analiza evidencia subida).
- Agente de seguridad (sección 8).
- Memoria por usuario (tabla `agent_memory`), orquestación con `streamText` + tools + `stepCountIs(50)`.

## Fase 10 — Datos reales

- Búsqueda web para precios actuales de créditos de carbono, tipo de cambio XLM/USD, datos de proyectos referencia.
- Integración Horizon Stellar para datos on-chain reales.

## Detalles técnicos

- Stack: TanStack Start + React 19 + Tailwind v4 + shadcn + Lovable Cloud (Supabase) + Lovable AI Gateway.
- Stellar SDK en serverFn (`*.functions.ts`), Freighter en cliente.
- Webhooks Stellar en `src/routes/api/public/stellar-webhook.ts` con verificación de firma.
- Accesibilidad WCAG AA: foco visible, Enter activa, aria-labels, contraste.

## Alcance fase inicial (entrega 1)

Por tamaño del proyecto, propongo entregar primero: **Fundaciones + Landing + Auth/Roles + Gestión de proyectos + Registros ambientales/ODS + Wallet Stellar Testnet básica (conectar, saldo, historial)**. Las fases 7 (tarjeta virtual), Soroban smart contracts, agentes IA avanzados y mainnet trustline USDC vendrían en iteraciones siguientes para mantener calidad.

¿Apruebas este alcance inicial, o prefieres priorizar otro subconjunto (p. ej. wallet+tokenización primero, landing después)?