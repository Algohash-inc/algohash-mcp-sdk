# Open API guide

The Open API MCP server gives an agent the model catalog, exact quotes, job submission and the balance,
under the same billing as the REST Open API.

| Method (SDK) | Tool | |
|---|---|---|
| `listModels` | `list_models` | Catalog with prices. Filter `kind` (`video`, `video_edit`, `audio`, `image`, `pipeline`, `analysis`, `utility`) or `search` |
| `quote` | `quote` | Exact HWT for `{ op, args }` — the quote is the charge |
| `generate` | `generate` | Submit `{ op, inputs }`. Charged on submission |
| `jobStatus` | `job_status` | Poll a job |
| `balance` | `balance` | HWT balance |

```ts
const open = new OpenClient({ apiKey: process.env.ALGOHASH_OPEN_KEY! });
const { models } = (await open.listModels({ kind: "image" })).unwrap();
const q = (await open.quote({ op: models[0].op, args: { resolution: "1K" } })).unwrap();
if (await askHuman(`Run for ${q.price_hwt} HWT?`)) {
  const job = (await open.generate({ op: models[0].op, inputs: { prompt: "…" } })).unwrap();
}
```

Op ids come from `list_models`; do not hard-code them, the catalog changes.

Things to know:

- **Quote first, every time.** Prices follow the underlying models and can change.
- **Identical submissions within 15 s collapse into one job** and return the same `job_id`. Vary the
  prompt or seed for distinct outputs; never fan out the identical payload.
- **Never blind-retry `generate`.** See [errors](../errors.md#retrying-safely).
- Failed jobs are refunded. Charges stop at the key's monthly cap (`monthly_cap_reached`, nothing charged).
- Some ops return a submission hint (`status: "use_rest"`) instead of a job; follow it with the same key.
