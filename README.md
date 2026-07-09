# react-form-engine

[![CI](https://github.com/xKirtle/react-form-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/xKirtle/react-form-engine/actions/workflows/ci.yml)

Data-driven forms for React: schemas for vocabulary, code for logic.

A form engine built on top of [TanStack Form](https://tanstack.com/form) that
owns the full lifecycle — parsing, validation, visibility, serialization —
with headless, pluggable rendering.

**[Documentation](https://xkirtle.github.io/react-form-engine/)** ·
**[Live demo](https://xkirtle.github.io/react-form-engine/demo/)** with an
inspectable engine-state readout · first npm release coming as `0.1.0`

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

## What it looks like

```tsx
import { type FieldMap, Form, FormRenderers, useFormEngine } from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";

interface Project {
  name: string;
  kind: string;
}

// fields are data, checked against the API model by the compiler
const fields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
    validation: { required: true, maxLength: { value: 40 } },
  },
  kind: {
    key: "kind",
    type: "select",
    label: "Kind",
    config: { items: [{ label: "Simple", value: "simple" }] },
    defaultValue: "simple",
  },
} as const satisfies FieldMap<Project>;

function ProjectForm() {
  // one hook owns parse → validate → serialize → submit
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["name", "kind"] }],
    context: undefined,
    initialErrors: "gated",
    onSubmit: async (project) => saveProject(project), // the API model
  });

  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <Form.AutoFields />
      </Form>
      <button type="button" onClick={() => void bundle.handleSubmit()}>
        Save
      </button>
    </FormRenderers>
  );
}
```

The [quickstart](https://xkirtle.github.io/react-form-engine/guide/quickstart)
walks through this step by step; the guides cover
[modules](https://xkirtle.github.io/react-form-engine/guide/modules),
[rules](https://xkirtle.github.io/react-form-engine/guide/rules), the
[row model](https://xkirtle.github.io/react-form-engine/guide/row-model),
and the rest of the engine.

## Packages

| Package | Description |
| --- | --- |
| `@react-form-engine/core` | The engine: schema types, runtime, and React bindings. Ships no renderers. |
| `@react-form-engine/renderers-html` | Accessible renderers built on native HTML elements. |

## License

[MIT](LICENSE)
