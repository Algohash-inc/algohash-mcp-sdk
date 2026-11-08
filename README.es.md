<p align="center">
  <a href="https://console.algohash.ai"><img src="assets/cover.jpg" alt="AlgoHash MCP SDK: build on AlgoHash from any language, any agent, any AI app. TypeScript, Python and Go." width="100%"></a>
</p>

<p align="center">
  <a href="README.md">🇺🇸 English</a> |
  <a href="README.zh-TW.md">🇹🇼 繁體中文</a> |
  <a href="README.zh-CN.md">🇨🇳 简体中文</a> |
  <a href="README.ja.md">🇯🇵 日本語</a> |
  <a href="README.ko.md">🇰🇷 한국어</a> |
  <a href="README.es.md">🇪🇸 Español</a> |
  <a href="README.vi.md">🇻🇳 Tiếng Việt</a> |
  <a href="README.id.md">🇮🇩 Bahasa Indonesia</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=for-the-badge" alt="Versión 0.1.0">
  <img src="https://img.shields.io/badge/MCP_tools-33-purple?style=for-the-badge" alt="33 herramientas MCP">
  <img src="https://img.shields.io/badge/actions-399-green?style=for-the-badge" alt="399 acciones">
  <img src="https://img.shields.io/badge/runtime_deps-0-brightgreen?style=for-the-badge" alt="Cero dependencias en tiempo de ejecución">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="Licencia MIT"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-Node_18+-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat-square&logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/MCP-2024--11--05_→_2025--11--25-6E56CF?style=flat-square" alt="Versiones del protocolo MCP">
</p>

<p align="center">
  <b>Construye sobre AlgoHash desde cualquier lenguaje, cualquier agente y cualquier app de IA.</b>
</p>

<p align="center">
  El SDK oficial de código abierto para los servidores <a href="https://modelcontextprotocol.io">Model Context Protocol</a> de AlgoHash.<br>
  Genera imágenes y vídeo, ejecuta storyboards, gestiona tu equipo de IA y llama a la Open API,<br>
  con clientes tipados para <b>TypeScript</b>, <b>Python</b> y <b>Go</b>, todos generados a partir de una única especificación abierta.
</p>

<p align="center">
  <a href="https://console.algohash.ai">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/hero-dark.svg">
      <img src="assets/hero.svg" alt="AlgoHash MCP SDK: un único cliente tipado en TypeScript, Python y Go para los servidores MCP de Studio, Team y Open API" width="800">
    </picture>
  </a>
</p>

<p align="center">
  <a href="#-inicio-rápido"><b>Inicio rápido</b></a> ·
  <a href="docs/overview.md"><b>Documentación</b></a> ·
  <a href="docs/reference/"><b>Referencia de herramientas</b></a> ·
  <a href="samples/"><b>Ejemplos</b></a> ·
  <a href="docs/security.md"><b>Seguridad</b></a> ·
  <a href="CHANGELOG.md"><b>Registro de cambios</b></a>
</p>

---

## ✨ Por qué AlgoHash MCP SDK

- **🔗 Un SDK, tres servidores** - Studio, Team y Open API comparten la misma forma de cliente, el mismo tipo de resultado y el mismo modelo de errores
- **🛡️ Seguro por defecto** - los pasos de pago y los públicos de Studio y Team esperan a que los apruebes en AlgoHash; tu agente no puede aprobar su propio gasto
- **🧬 Tipado y generado** - 399 acciones, cada una envuelta y documentada directamente desde la especificación abierta, así que el SDK nunca se desincroniza de los servidores
- **🪶 Cero dependencias** - solo `fetch`, `urllib` y `net/http` de la plataforma; nada extra que auditar, fijar o parchear
- **🧪 Pruébalo sin clave** - un servidor mock local ejecuta todos los ejemplos y pruebas sin cuenta y sin gasto

## 🚀 Inicio rápido

### 1. Instalar

```bash
npm install @algohash/mcp                                  # TypeScript / JavaScript
pip install algohash-mcp                                   # Python
go get github.com/Algohash-inc/algohash-mcp-sdk/sdks/go      # Go
```

### 2. Obtener una clave

Crea una en **Studio → MCP → Keys** (o en **Team → MCP → Keys & scopes**, o en la página de claves de Open API),
y guárdala en una variable de entorno. Nunca la escribas directamente en el código.

```bash
export ALGOHASH_STUDIO_KEY="smk_..."
```

### 3. Haz tu primera llamada

```ts
import { StudioClient } from "@algohash/mcp";

const studio = new StudioClient({ apiKey: process.env.ALGOHASH_STUDIO_KEY!, keyScopes: ["read", "edit"] });
const assets = await studio.core.listAssets({ pillar: "avatars" });
console.log(assets.status, assets.data);
```

¿Aún no tienes clave? Ejecuta `node tools/mock-server.mjs` y define `ALGOHASH_MOCK=1`. Todos los ejemplos funcionan sin conexión.

## 🧩 Qué puedes construir

| Servidor | Endpoint | Para construir cosas como | Clave |
|----------|----------|----------|----------|
| **🎬 Studio** | `https://console.algohash.ai/mcp/studio` | Un agente que convierte un brief en un storyboard y luego en un vídeo terminado · un explorador de biblioteca · un publicador social programado | `smk_…` u OAuth |
| **🤝 Team** | `https://console.algohash.ai/mcp/team` | Un creador de equipos que redacta compañeros a partir de un brief · un bot de despliegue que asigna trabajo a un grupo · un bucle de evolución | `tmk_…` u OAuth |
| **⚡ Open API** | `https://console.algohash.ai/open/v1/mcp` | Un widget de precios · un generador por lotes con cotizaciones · un monitor de saldo | Clave de Open API |

Cada clave está vinculada a **una sola cuenta: la tuya**. Ningún argumento puede alcanzar otra cuenta, y el
servidor lo garantiza hagas lo que hagas desde el cliente.

## 🔍 Descubre qué puede hacer una clave

Cada acción de la especificación declara los scopes que necesita. Analiza una clave antes de dársela a un agente:

```
+------------------------------------------------------------------------------+
|  KEY: Studio, scopes [read, edit]           271 allowed  ·  58 denied        |
+------------------------------------------------------------------------------+
|                                                                              |
|  ALLOWED (sample)                                                            |
|     studio.list_assets ............ read      browse your library            |
|     studio_create.storyboard ...... edit      plan a storyboard (free)       |
|     studio_storyboard.approve ..... edit      approve a drawn storyboard     |
|                                                                              |
|  DENIED: needs spend                                                         |
|     studio.generate_image ......... spend     paid image generation          |
|     studio_create.storyboard_draw . spend     draw storyboard frames         |
|                                                                              |
|  DENIED: needs publish                                                       |
|     studio.ig_publish_now ......... publish   posts publicly                 |
|                                                                              |
|  NOTE                                                                        |
|     motion_create, motion_direct_reply: free with some arguments, paid       |
|     with others. The paid path is refused without `spend`.                   |
|                                                                              |
+------------------------------------------------------------------------------+
```

```bash
node tools/permissions.mjs studio read,edit            # this table, per tool
node tools/permissions.mjs studio read,edit --denied   # only what the key cannot do
```

La misma comprobación está integrada en cada cliente: `canCall`, `allowedActions` y `requiredScopes` rechazan una
llamada fuera de alcance antes de que salga de tu máquina.

## 💳 Cómo funciona una llamada de pago

```
┌─────────────────────────────────────────────────────────────────┐
│  1. CALL                                                        │
│     studio.generate_image { prompt, ratio }                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. LOCAL PREFLIGHT (SDK)                                       │
│     • Key has `spend`?  No → scope_denied, nothing is sent      │
│     • HTTPS endpoint, no redirect, key in header only           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. SERVER QUOTES: needs_confirmation (not an error)            │
│     • fee_hwt + summary + single-use confirm_token              │
│     • MCP Apps hosts show a card: Approve / Decline             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. THE USER APPROVES                                           │
│     • one tap on Approve, or a yes in chat. Nothing charged yet │
│     • page-approval keys: only the owner, on approve_url        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. SAME CALL + confirm_token → job starts, cost charged once   │
└─────────────────────────────────────────────────────────────────┘
```

Los pasos públicos (publicar, postear) siguen el mismo ciclo con `needs_permission` y un
`permission_token`. Los pasos destructivos se rechazan con `confirm_required` a menos que pases `confirm: true`.

## 🧭 Studio vs. Team vs. Open API

### 🟣 Studio

- Tu cuenta de Studio: biblioteca, imágenes, vídeo, storyboards, editor, resultados, publicaciones sociales
- Scopes `read`, `edit`, `spend`, `publish`; las claves nuevas usan por defecto `read` + `edit` + `spend`
- Primero el storyboard: todo vídeo parte de un storyboard que tú aprobaste
- 22 herramientas · 329 acciones

### 🟢 Team

- Tu equipo de IA: compañeros, grupos, blueprints, skills, despliegues, evolución
- Scopes `read`, `edit`, `spend`; las claves nuevas usan por defecto `read` + `edit`
- Siempre pregunta antes de gastar, eliminar, aplicar un borrador o abrir una herramienta de riesgo
- `client_ref` hace que las llamadas de creación sean seguras de reintentar; los borradores llevan un `rev`
- 6 herramientas · 70 acciones

### 🟠 Open API

- Catálogo de modelos, cotizaciones, envío de trabajos, saldo
- Sin scopes; un límite mensual en la clave
- Primero cotiza, luego genera y después consulta `job_status`
- 5 herramientas

## 📦 Características

- **Wrappers generados** - un método por acción en los tres lenguajes, con scopes y flags en los comentarios de documentación
- **Preflight local de scopes** - las llamadas fuera de alcance fallan de inmediato con `scope_denied` y nunca llegan a la red
- **Ayudantes de aprobación** - `callWithApproval` entrega cada cotización y cada solicitud de permiso a tu aprobador y nunca aprueba por sí solo
- **Transporte reforzado** - solo HTTPS (salvo `localhost`), sin redirecciones, límite de tamaño de respuesta, las claves nunca se imprimen ni se serializan
- **Lotes y reintentos** - hasta 20 llamadas por lote; `rate_limited` se reintenta con el `retry_after_sec` del servidor, con un tope de 30 segundos
- **Resultados tipados** - un único `ToolResult` para datos, aprobaciones y errores, más pistas `next` del servidor
- **Servidor mock y escáneres** - mock sin conexión, escáner de permisos, generador de código y escáner de fugas en `tools/`
- **Referencia generada** - cada herramienta, acción, scope y flag en [docs/reference](docs/reference/)

## 🔌 Conecta una app de IA

No hace falta código. Apunta la app a la URL de un servidor e inicia sesión.

| Host | Cómo |
|----------|----------|
| **Claude** (web, escritorio, móvil) | Settings → Connectors → Add custom connector → pega la URL → inicia sesión |
| **ChatGPT** | Settings → Apps & Connectors → Developer mode → Create → URL + OAuth |
| **VS Code** | [`samples/hosts/vscode/mcp.json`](samples/hosts/vscode/mcp.json) (la clave se pide al usar, nunca se guarda en el archivo) |
| **Claude Code** | [`samples/hosts/claude-code/.mcp.json`](samples/hosts/claude-code/.mcp.json) (clave desde `${ALGOHASH_STUDIO_KEY}`) |
| **OpenAI Codex** | [`samples/hosts/codex/config.toml`](samples/hosts/codex/config.toml) (`bearer_token_env_var`) |

Guías paso a paso para cada host: [docs/hosts.md](docs/hosts.md).

## 💻 Uso del SDK

### TypeScript

```ts
import { StudioClient } from "@algohash/mcp";

const studio = new StudioClient({ apiKey: process.env.ALGOHASH_STUDIO_KEY!, keyScopes: ["read", "edit", "spend"] });

// Free read.
const assets = await studio.core.listAssets({ pillar: "avatars" });

// Paid step: the server answers needs_confirmation with a price and a single-use token.
// callWithApproval hands it to YOUR approver; it never approves on its own.
const r = await studio.callWithApproval(
  "studio_create",
  { action: "storyboard_draw", version: "v_123" },
  { approve: async (q) => askHuman(`Spend ${q.feeHwt} HWT on ${q.tool}.${q.action}? ${q.approveUrl ?? ""}`) },
);
console.log(r.status, r.data);   // "ok" | "declined" | "awaiting_approval" | "error" | …
```

### Python

```python
import os
from algohash_mcp import StudioClient

studio = StudioClient(os.environ["ALGOHASH_STUDIO_KEY"], key_scopes=["read", "edit", "spend"])
r = studio.call_with_approval("studio_create", {"action": "storyboard_draw", "version": "v_123"},
                              approve=lambda q: ask_human(f"Spend {q.fee_hwt} HWT? {q.approve_url or ''}"))
```

### Go

```go
s := algohash.NewStudio(os.Getenv("ALGOHASH_STUDIO_KEY"), algohash.WithKeyScopes("read", "edit", "spend"))
r, err := s.CallWithApproval(ctx, "studio_create", algohash.Params{"action": "storyboard_draw", "version": "v_123"}, askHuman)
```

### Ejemplos de prompts

Cuando un servidor esté conectado a tu app de IA, simplemente pregunta:

```
Muéstrame los personajes de mi biblioteca de Studio.
Planifica un storyboard de 20 segundos para una marca de café y enséñame la cotización antes de dibujarlo.
Crea un equipo de investigación de tres personas a partir de este brief y déjame revisar primero el borrador.
¿Cuánto costaría una imagen de 1K en la Open API?
```

### Ejemplos

```bash
node tools/mock-server.mjs                                    # terminal 1: 127.0.0.1:8787
```

```bash
ALGOHASH_MOCK=1 node samples/typescript/03-generate-image.mjs # terminal 2
```

| Ejemplo | TypeScript | Python | Go |
|----------|----------|----------|----------|
| **¿Qué puede hacer esta clave?** | `01-permissions.mjs` | `01_permissions.py` | `cmd/permissions` |
| **Explorar la biblioteca** | `02-library.mjs` | `02_library.py` | |
| **Generar una imagen (de pago)** | `03-generate-image.mjs` | `03_generate_image.py` | `cmd/generate-image` |
| **Storyboard y después vídeo** | `04-storyboard-video.mjs` | `04_storyboard_video.py` | |
| **Team: desplegar trabajo** | `05-team-deploy.mjs` | `05_team_deploy.py` | `cmd/team-deploy` |
| **Open API: cotizar → generar** | `06-open-quote.mjs` | `06_open_quote.py` | `cmd/open-quote` |
| **Herramientas para tu propio agente** | `07-agent-context.mjs` | | |

Los ejemplos te preguntan en la terminal antes de cualquier paso de pago o público. Sin terminal, lo rechazan.

## 📚 Documentación

| Tema | Qué aprenderás |
|----------|----------|
| [Overview](docs/overview.md) | Servidores, herramientas y acciones, HWT, resultados, pistas `next` |
| [Authentication](docs/authentication.md) | Claves estáticas, OAuth 2.1, rotación, almacenamiento |
| [Permissions](docs/permissions.md) | Scopes, mínimo privilegio, análisis de una clave · [matriz completa](docs/reference/permissions.md) |
| [Approvals](docs/approvals.md) | `needs_confirmation`, `needs_permission`, `needs_storyboard`, `needs_cast` |
| [Protocol](docs/protocol.md) | Transporte, versiones, lotes, formas de resultado |
| [Errors and limits](docs/errors.md) | Todos los códigos de error, qué reintentar y qué no reintentar nunca |
| [Security](docs/security.md) | Modelo de amenazas para integradores: claves, prompt injection, control del gasto |
| [Connecting MCP hosts](docs/hosts.md) | Claude, ChatGPT, VS Code, Claude Code, Codex, cualquier cliente |
| **Guías** | [Studio](docs/guides/studio.md) · [Team](docs/guides/team.md) · [Open API](docs/guides/open.md) |
| **SDKs** | [TypeScript](docs/sdk-typescript.md) · [Python](docs/sdk-python.md) · [Go](docs/sdk-go.md) |
| **Referencia** | [Studio](docs/reference/studio.md) · [Team](docs/reference/team.md) · [Open API](docs/reference/open.md) (generada) |

## 🔐 Seguridad

**No se cobra nada hasta que apruebas.** Un paso de pago o público devuelve primero un presupuesto; un toque en **Aprobar**
en la tarjeta lo ejecuta (en hosts sin tarjetas, di «sí» en el chat). Para las claves que necesitan más control, activa
**Solo yo puedo aprobar pasos de pago y de riesgo**: esos pasos devuelven una `approve_url`, solo tú puedes aprobarlos
en AlgoHash con tu sesión iniciada, y un «sí» escrito en el chat no cuenta.

- **Mínimo privilegio** - da a cada integración los menos scopes posibles. `spend` y `publish` son permisos independientes, y `spend` no implica `edit`
- **Límites estrictos** - los scopes, el límite diario (claves MCP) o mensual (claves de Open API) y la revocación se mantienen aunque un agente sufra una prompt injection
- **Las claves siguen siendo secretas** - se envían solo en la cabecera `Authorization` por HTTPS, nunca se imprimen y nunca se siguen a través de una redirección

> Con la aprobación de un toque, un agente con prompt injection podría aprobar un paso por sí mismo. Activa **Solo yo puedo aprobar pasos de pago y de riesgo** en cualquier clave cuyo agente lea contenido que no controlas.
> Sin ella, las aprobaciones evitan errores, no a un agente comprometido. Lee antes [docs/security.md](docs/security.md).

¿Encontraste una vulnerabilidad? Repórtala en privado, como se describe en [SECURITY.md](SECURITY.md).

## 🤝 Contribuir

Las contribuciones son bienvenidas. Este repositorio es **solo la interfaz**: herramientas, argumentos, scopes, el
protocolo de aprobación y los códigos de error. No contiene código de servidor, y el servidor es la autoridad en todo.

```
spec/                 The interface: studio.json, team.json, open.json (+ i18n summaries)
sdks/typescript/      @algohash/mcp
sdks/python/          algohash-mcp
sdks/go/              github.com/Algohash-inc/algohash-mcp-sdk/sdks/go
docs/                 Guides + generated reference
samples/              TypeScript, Python, Go samples + MCP host configs
tools/                codegen · mock-server · permissions · leak-scan · readme-check
```

```bash
# 1. The spec is the source of truth. Regenerate wrappers and reference:
node tools/codegen.mjs

# 2. Check generated files, scan for leaks, keep translations in step
node tools/codegen.mjs --check
node tools/leak-scan.mjs
node tools/readme-check.mjs

# 3. Test all three SDKs
(cd sdks/typescript && npm ci --ignore-scripts && npm test)
(cd sdks/python && python3 -m unittest discover -s tests)
(cd sdks/go && go vet ./... && go test -race ./...)
```

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un pull request. La CI ejecuta los mismos pasos y cada
ejemplo contra el servidor mock.

## 🛠 Solución de problemas

### `scope_denied`

A la clave le falta un scope que la acción necesita. Compruébalo con `node tools/permissions.mjs studio <tus scopes>`,
y luego añade el scope en Studio → MCP → Keys (o Team → MCP → Keys & scopes). No reintentes sin cambios.

### `needs_confirmation` / `needs_permission`

No son errores. Muestra al usuario el precio y el resumen (los hosts con tarjetas muestran la tarjeta). Cuando apruebe
(un toque, o «sí» en el chat; en claves con aprobación por página, en la `approve_url`), repite la
**misma llamada exacta** con el token. Los tokens son de un solo uso, están ligados a los argumentos y caducan a los
5 minutos aproximadamente. ¿Cambiaste un argumento? Vuelve a pedir la aprobación.

### `awaiting_approval`

Solo en claves con aprobación por página: reintentaste antes de que el propietario aprobara en AlgoHash. No se ejecutó nada ni se cobró nada. Espera con
`studio_confirm.wait` (o `team_confirm.wait`) y reintenta con el mismo token.

### `insecure_endpoint` / `bad_endpoint`

El SDK rechaza `http://` (salvo `localhost`) y las URL que contienen credenciales. Usa el endpoint
`https://`. Nunca tomes el endpoint de una entrada no confiable.

### `rate_limited`

Espera `retry_after_sec` segundos. Los SDK reintentan esto automáticamente, con un tope de 30 segundos.

### `stale_rev` (Team)

Alguien cambió el borrador. Llama a `team_blueprint.get` para obtener el `rev` más reciente y reintenta con él.

### Se filtró una clave

Revócala ahora mismo en la app. Deja de funcionar en la siguiente petición. Después revisa la actividad de tu cuenta.

## 💬 Comunidad y soporte

- **Preguntas y errores** - abre un issue en este repositorio
- **Reportes de seguridad** - nunca en público; sigue [SECURITY.md](SECURITY.md)
- **Qué ha cambiado** - [CHANGELOG.md](CHANGELOG.md)
- **Compatible con** - Claude (web, escritorio, móvil) · ChatGPT · VS Code (GitHub Copilot Chat) · Claude Code · OpenAI Codex · cualquier cliente MCP que hable Streamable HTTP

---

## 📄 Licencia

Publicado bajo la [Licencia MIT](LICENSE). Copyright © 2026 AlgoHash Inc.

<p align="center">
  <a href="https://console.algohash.ai"><img src="assets/algohash-icon.png" alt="AlgoHash" width="40" height="40"></a><br>
  <sub>Creado por <a href="https://console.algohash.ai">AlgoHash</a> · Si este SDK te ayuda, dale una ⭐ al repositorio</sub>
</p>
