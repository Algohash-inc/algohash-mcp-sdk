# Contributing

Thanks for helping. Small, focused pull requests are easiest to review.

## Ground rules

- **The spec is the source of truth.** `spec/*.json` describes the public interface. The per-tool
  wrappers in every SDK and `docs/reference/` are generated from it. Do not edit generated files
  (`sdks/*/…/generated`, `_generated`, `gen_*.go`, `docs/reference/*`); run `node tools/codegen.mjs`.
- The spec changes only when the public servers change. A PR that adds a tool or action the servers do
  not have will be closed.
- Keep the SDKs **dependency-free** at run time (standard library / platform `fetch` only).
- Keep the three SDKs behaving the same. A change to one client's behavior needs the same change and
  test in the other two.

## Before you open a PR

```bash
node tools/codegen.mjs --check        # generated code is up to date
node tools/leak-scan.mjs              # no keys, personal paths, private hosts
node tools/readme-check.mjs            # translated READMEs match README.md
(cd sdks/typescript && npm ci --ignore-scripts && npm test)
(cd sdks/python && python3 -m unittest discover -s tests)
(cd sdks/go && go vet ./... && go test -race ./...)
```

CI runs the same steps plus every sample against the mock server.

## Translations

`README.md` is the source. When you change it, update every `README.*.md` in the same PR (or say in the
PR which ones still need it). Code blocks, commands, error codes and scope names stay in English.
`node tools/readme-check.mjs` checks the language bar, the structure and every relative link.

## Security-sensitive changes

Changes to key handling, endpoint checks, redirects, response limits or the approval helpers need a
test in `security` tests of every SDK. Never add a code path that approves a paid or public step on its
own, logs a key, or sends a key anywhere except the configured endpoint's `Authorization` header.

Found a vulnerability? Do not open a PR or issue. Follow [SECURITY.md](SECURITY.md).

## Commit and sign-off

Write commit messages in English, imperative mood (`fix(go): …`, `docs: …`). By contributing you agree
your contribution is licensed under the [MIT license](LICENSE).
