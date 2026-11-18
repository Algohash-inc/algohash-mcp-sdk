# @algohash/mcp

Typed client for the AlgoHash Studio, Team and Open API MCP servers. Node 18+, Deno, Bun and browsers.
Zero runtime dependencies.

```bash
npm install @algohash/mcp
```

Sign a terminal in with your phone instead of copying a key (Studio and Team; spending stays off until
you turn it on). See [terminal login](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/terminal-login.md).

```bash
npx @algohash/mcp login
```

```ts
import { StudioClient } from "@algohash/mcp";

const studio = new StudioClient({ apiKey: process.env.ALGOHASH_STUDIO_KEY!, keyScopes: ["read", "edit"] });
const assets = await studio.core.listAssets({ pillar: "avatars" });
console.log(assets.status, assets.data);
```

Paid and public steps return an approval request. `callWithApproval` asks your approver and never
approves on its own. By default one tap on the approval card (or a yes in chat) approves. When the key owner turns on
"Only I can approve paid and risky steps", only they can approve, on the AlgoHash link the request
carries, and the helper waits for that decision. Keys are sent only in the `Authorization` header over HTTPS, never printed.

Docs: [SDK guide](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/sdk-typescript.md) · [permissions](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/permissions.md) ·
[approvals](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/approvals.md) · [security](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/security.md) · [tool reference](https://github.com/Algohash-inc/algohash-mcp-sdk/blob/main/docs/reference/)

License: MIT
