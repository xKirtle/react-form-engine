# react-form-engine

Data-driven forms for React: schemas for vocabulary, code for logic.

A form engine built on top of [TanStack Form](https://tanstack.com/form) that
owns the full lifecycle — parsing, validation, visibility, serialization —
with headless, pluggable rendering.

## Why another form library?

The good React form libraries already handle field state well. This project
is about the layer above it — the code every app accumulates around its form
library once it has more than a few forms:

- **Typed field schemas** — fields are plain data bound to your API model; a
  misspelled key or mismatched type is a compile error.
- **Composable modules** — form variants (create/edit, per plan, per feature)
  share one definition instead of drifting copies.
- **Transforms** — API ↔ form model conversion lives on the field definition;
  the compiler requires one whenever the types don't line up.
- **Typed rules** — dynamic behavior ("when X changes, seed/show/clear Y")
  without `useEffect` chains or a JSON condition language.
- **Error display policy** — errors show on touch, on submit, or immediately
  for data that arrived invalid from the API. Your choice, per form.
- **List row model** — rows carry stable identity, provenance (API, rule, or
  user?), and metadata like pinned or read-only, owned by the engine.
- **Headless rendering** — schema-bound components with pluggable renderer
  maps; accessible native HTML renderers included.

This comes from having built exactly this layer by hand a few too many times.

## Why TanStack Form?

Field state is a solved problem, and solving it again would mostly add bugs —
[TanStack Form](https://tanstack.com/form) is headless, type-safe, and
actively maintained, so the engine builds on it. It is not a thin wrapper,
though: schema resolution, modules, transforms, rules, validation display
policy, visibility, and the row model all live in the engine. In normal use
you never touch TanStack Form directly.

## Packages

| Package | Description |
| --- | --- |
| `@react-form-engine/core` | The engine: schema types, runtime, and React bindings. Ships no renderers. |
| `@react-form-engine/renderers-html` | Accessible renderers built on native HTML elements. |

## License

[MIT](LICENSE)
