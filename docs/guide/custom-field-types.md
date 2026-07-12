# Custom field types

_Every concept on this page runs live in [the demo](https://xkirtle.github.io/react-form-engine/demo/#/custom-field-types)._

The built-in types cover the common ground; anything else you register
yourself, and a registered type is a first-class citizen — key binding
checked against the API model, a validation vocabulary, transform
requirements, renderer lookup, all of it. A custom type has three parts,
each small, all living in your codebase:

1. a **type registration** — what values the type holds;
2. a **runtime entry** — what the engine needs to know at runtime;
3. a **renderer** — what it looks like.

The walkthrough builds a `rating` type: a number from zero to a
configurable maximum, rendered as buttons.

## 1. Register the type

The registry is a TypeScript interface, extended by module augmentation —
put this next to your type's code, once for the whole app:

```ts
import type { FieldTypeSpec } from "@react-form-engine/core";

declare module "@react-form-engine/core" {
  interface FieldTypeRegistry {
    rating: FieldTypeSpec<number, { max: number }>;
  }
}
```

`FieldTypeSpec<TValue, TConfig>` declares the value domain and the config
shape. The validation vocabulary comes free: it defaults from the value
domain, so `rating` fields accept `min`, `max`, `required`, `custom`, and
`schema` exactly like the built-in `number` — a third type parameter can
narrow or extend it if the default doesn't fit.

From this point the compiler treats `type: "rating"` like any built-in: it
binds only to `number`-valued keys (or demands a transform), rejects
foreign validation rules, and checks `config` against `{ max: number }`
wherever one is given.

## 2. Provide the runtime

Every custom type needs a runtime entry — the engine refuses to parse a
type it has no runtime for. For a scalar type it's usually just the empty
value:

```ts
import type { FieldTypeRuntime } from "@react-form-engine/core";

const appFieldTypes: Record<string, FieldTypeRuntime> = {
  rating: { emptyValue: () => Number.NaN },
};

const bundle = useFormEngine<Project, undefined, typeof fields>({
  fields,
  fieldTypes: appFieldTypes,
  // ...
});
```

`emptyValue` is what the field holds when the API provides nothing and no
`defaultValue` is set — absence never reaches the form model. Keep the
`appFieldTypes` object module-level: the engine treats it as configuration,
not something to rebuild per render.

## 3. Write the renderer

A renderer for a custom type is the same contract as any other — see
[Rendering](./rendering). Config arrives on the definition:

```tsx
import type { FieldRenderProps } from "@react-form-engine/core";
import { FieldFrame } from "@react-form-engine/renderers-html";

function RatingRenderer(props: FieldRenderProps) {
  const value = props.value as number;
  const { max } = props.definition.config as { max: number };
  return (
    <FieldFrame
      label={props.definition.label ?? props.name}
      error={props.presentation.error}
      required={props.required}
      asGroup
    >
      {() => (
        <div role="radiogroup" aria-label={String(props.definition.label)}>
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} of ${max}`}
              onClick={() => props.setValue(n)}
              onBlur={props.markTouched}
            >
              {value >= n ? "★" : "☆"}
            </button>
          ))}
        </div>
      )}
    </FieldFrame>
  );
}
```

Register it by merging over the base map:

```tsx
<FormRenderers renderers={{ ...htmlRenderers, rating: RatingRenderer }}>
```

## Use it

```ts
const fields = {
  satisfaction: {
    key: "satisfaction",           // must be a number in the API model
    type: "rating",
    label: "Satisfaction",
    config: { max: 5 },            // required, typed
    validation: { min: { value: 1, message: "Rate at least one star" } },
  },
} as const satisfies FieldMap<Survey>;
```

Everything checks: binding `satisfaction` to a string key is a compile
error, a `config` with the wrong shape is a compile error, `maxLength` in
validation is a compile error. The type is indistinguishable from a
built-in — which is the whole point. (Note `config` itself is optional on
definitions, so a renderer should fall back sensibly when it's absent.)

## List-shaped custom types

A custom type whose value domain is an array joins the
[row model](./row-model) automatically: parsed items are wrapped in rows,
`serialize` unwraps them, and object-item lists work with `ensureRows` and
`knownRows` with no extra registration.

Two runtime knobs matter for lists. `list.isBlankItem` and
`list.isCompleteItem` define blankness and completeness for your item
shape — the defaults check string cells, so a type with boolean or numeric
cells should supply its own:

```ts
const appFieldTypes: Record<string, FieldTypeRuntime> = {
  permissionList: {
    emptyValue: () => [],
    list: {
      // a permission row is blank only while its name is empty;
      // its boolean flags don't count as content
      isBlankItem: (item) => (item as Permission).name.trim() === "",
      isCompleteItem: (item) => (item as Permission).name.trim() !== "",
    },
  },
};
```

With those two functions supplied, validation, blank-row dropping, and
`canAdd` all follow your definition of "filled in".

## When to reach for a custom type

A [render-prop field](./rendering) covers a one-off appearance. A custom
type earns its registration when the *concept* recurs: several forms, its
own config and validation semantics, one renderer to maintain. If you're
copying the same render prop into a third form, it's a type.
