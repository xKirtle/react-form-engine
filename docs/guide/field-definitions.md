# Field definitions

_Every concept on this page runs live in [the demo](https://xkirtle.github.io/react-form-engine/demo/#/field-definitions)._

A form starts as a *field map*: plain TypeScript data describing every
field the form can have. No JSX, no registration calls — an object you can
export, share between forms, and test like any other value.

```ts
import type { FieldMap } from "@react-form-engine/core";

interface Project {
  name: string;
  budget: number;
  launchDate: string;
  archived: boolean;
  settings: { visibility: "private" | "public" };
}

const fields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
    description: "Shown in the project list",
    validation: { required: true, maxLength: { value: 40 } },
  },
  budget: { key: "budget", type: "number", label: "Budget" },
  launchDate: { key: "launchDate", type: "date", label: "Launch date" },
  archived: { key: "archived", type: "checkbox", label: "Archived" },
  visibility: {
    key: "settings.visibility",
    type: "select",
    label: "Visibility",
    config: {
      items: [
        { label: "Private", value: "private" },
        { label: "Public", value: "public" },
      ],
    },
    defaultValue: "private",
  },
} as const satisfies FieldMap<Project>;
```

Two things carry most of the design:

**The map name is the field's identity.** Modules select `"visibility"`,
`Form.Field` renders `name="visibility"`, and `engine.getValue("visibility")`
reads it. The definition's `key` is a separate thing — the path into your
API model that the field binds to. They often coincide, but a nested or
unwieldy path can sit behind a friendlier name, as `visibility` does above.

**`as const satisfies FieldMap<Project>` is load-bearing.** `satisfies`
makes the compiler check every binding against `Project` — an unknown
`key`, a value that doesn't fit the field type, a validation rule from the
wrong vocabulary, all become type errors at the definition site. `as const`
keeps the literal types (`type: "text"`, not `type: string`), which is what
lets rules and typed components infer everything later. Leave either half
off and the map still works, but the compiler stops working for you.

## Keys are checked paths

`key` accepts any dot-separated path into the API model — top-level
properties, nested objects (`"settings.visibility"`), through optional
objects too. It does not accept paths that don't exist, and it does not
address array elements: list values are handled whole, by the
[row model](./row-model).

The value at the path must fit the field type's *value domain* (below). If
it doesn't, the definition requires a `transform` that converts in both
directions — see [Transforms](./transforms). This is checked by the
compiler, so a mismatch can't be waved through by convention.

## Built-in field types

| Type | Form value | Notes |
| --- | --- | --- |
| `text` | `string` | |
| `number` | `number` | An empty input holds `NaN`; serialization omits it. |
| `date` | `string` | ISO 8601 date (`"2026-07-09"`) — the native date input's own value format. A `Date`-typed API property needs a transform. |
| `checkbox` | `boolean` | `required` means "must be checked". |
| `select` | `string` | Options come from `config.items` or `engine.setOptions`. |
| `stringList` | `string[]` | Row-model list of strings. |
| `keyValueList` | `{ key, value }[]` | Row-model list of pairs. |

The registry is extensible — see
[Custom field types](./custom-field-types) for adding your own with the
same compile-time treatment as the built-ins.

## The optional slots

Everything except `key` and `type` is optional:

- **`label`, `description`** — presentation text, passed to renderers.
  A field that never renders (one that exists only to validate or carry a
  value) doesn't need them.
- **`validation`** — rules from the field type's vocabulary, plus the
  universal `required`, `custom`, and `schema` slots. Covered in
  [Validation & errors](./validation).
- **`defaultValue`** — used at parse when the API provides no value for
  the key. It is a form-model value: for the `visibility` field above it
  must be `"private"` or `"public"`, not any string.
- **`config`** — per-type configuration, like a select's `items`. Types
  that declare no config accept none.
- **`transform`** — the API ↔ form conversion, required exactly when the
  types don't line up. See [Transforms](./transforms).
- **`whenHidden`** — what a hidden field contributes at serialize:
  `"omit"` (default), `"null"`, or `"keep"`. See
  [Rules & the engine API](./rules).
- **`knownRows`** — parse-time row metadata for list fields. See
  [The row model](./row-model).

## Absence never reaches the form

When the API provides no value for a key, parsing falls back to
`defaultValue`, and past that to the type's *empty value*: `""` for text,
date, and select; `false` for checkbox; `[]` for lists; `NaN` for number.
Renderers and rules can rely on values always having the right shape —
there is no `undefined` case to defend against, even for optional API
properties.

The `NaN` choice for numbers is deliberate: it is the only "no value yet"
that is honestly a number. It is what an empty native number input yields,
`required` treats it as missing, and serialization omits the key rather
than sending it.

## One map, many forms

A field map is a vocabulary, not a form. Nothing in it says which fields
appear, in what variant, or under which conditions — that's the job of
[modules](./modules), which select from the map and can override any slot
except `key` and `type`. Define the vocabulary once, next to the API type
it describes, and let every form over that model draw from it.
