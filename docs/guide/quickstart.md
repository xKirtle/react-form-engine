# Quickstart

_Prefer seeing it run? [The live demo](https://xkirtle.github.io/react-form-engine/demo/) pairs every guide with running examples._

A working form in four steps: define fields as data, compose them into a
module, hand everything to the engine, render.

## Install

```sh
npm install @react-form-engine/core @react-form-engine/renderers-html
```

The core needs React 18+ and `@tanstack/react-form` as peers. The
renderers package is optional — it provides accessible renderers built on
native HTML elements, and you can replace it with your own renderer map at
any point.

## 1. Define fields as data

Fields bind to your API model by path. The compiler checks every binding:
an unknown key or a value that doesn't fit the field type is a type error.

```ts
import type { FieldMap } from "@react-form-engine/core";

interface Project {
  name: string;
  kind: string;
  launchDate: string;
  public: boolean;
}

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
    config: {
      items: [
        { label: "Simple", value: "simple" },
        { label: "Funded", value: "funded" },
      ],
    },
    defaultValue: "simple",
  },
  launchDate: { key: "launchDate", type: "date", label: "Launch date" },
  public: { key: "public", type: "checkbox", label: "Public project" },
} as const satisfies FieldMap<Project>;
```

## 2. Hand the schema to the engine

One hook owns the whole lifecycle: it parses `initialValues`, validates,
tracks dirtiness, and serializes back to the API model on submit.

```ts
import { useFormEngine } from "@react-form-engine/core";

const bundle = useFormEngine<Project, undefined, typeof fields>({
  fields,
  modules: [{ fields: ["name", "kind", "launchDate", "public"] }],
  context: undefined,
  initialErrors: "gated", // create form: reveal errors on touch or submit
  onSubmit: async (project) => {
    // project is the serialized API model
    await saveProject(project);
  },
});
```

## 3. Render

The core ships no renderers — `FormRenderers` maps field types to
components. `Form.AutoFields` renders every resolved field in schema
order.

```tsx
import { Form, FormRenderers } from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import "@react-form-engine/renderers-html/styles.css"; // optional

function ProjectForm() {
  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <Form.AutoFields />
      </Form>
      <button type="button" onClick={() => void bundle.handleSubmit()}>
        Save project
      </button>
    </FormRenderers>
  );
}
```

## 4. Submit

`bundle.handleSubmit()` marks the form as submitted (revealing any gated
errors), validates, and — only if everything passes — serializes the form
back to your API model and calls `onSubmit`.

That's the whole loop: API model in, API model out, with the engine owning
everything in between.

## Where next

- The [live demo](https://xkirtle.github.io/react-form-engine/demo/) walks
  every engine feature with an inspectable state readout.
- [Field definitions](./field-definitions) is the natural next page — the
  vocabulary everything else builds on. From there the sidebar reads in
  order: [transforms](./transforms), [modules](./modules),
  [rules](./rules), [validation](./validation), the
  [row model](./row-model), [rendering](./rendering),
  [custom field types](./custom-field-types), and
  [localization](./localization).
