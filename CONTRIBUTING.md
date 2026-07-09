# Contributing

Thanks for your interest! Issues and pull requests are welcome.

## Setup

```sh
pnpm install
pnpm build        # required once: packages resolve each other through dist
pnpm test
```

Node 20+ and pnpm 11 (via corepack) are expected. Useful scripts, all from
the repo root:

| Script | What it does |
| --- | --- |
| `pnpm test` | Unit + type tests for all packages |
| `pnpm typecheck` | `tsc --noEmit` everywhere |
| `pnpm lint` / `pnpm lint:fix` | Biome check / autofix |
| `pnpm build` | Build both packages |
| `pnpm demo` | The live dev harness — package imports are aliased to source, so library edits hot-reload |
| `pnpm docs:dev` | Docs site with the generated API reference |

## Making changes

- Tests live next to the code (`__tests__`); type-level tests are
  `*.test-d.ts` and run with the normal test command.
- Behavior changes need tests; renderer changes should keep the axe and
  ARIA sweeps green.
- Run `pnpm lint:fix && pnpm typecheck && pnpm test` before pushing — CI
  runs the same.

## Changesets

Every change that should ship adds a changeset:

```sh
pnpm changeset
```

Pick the affected packages and a bump level, and describe the change from
a consumer's point of view — changeset text becomes the changelog.
Doc-only or demo-only changes don't need one.

## Releases

Maintainers merge the auto-generated "Version Packages" PR; CI publishes
to npm from there.
