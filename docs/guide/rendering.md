# Rendering

The core renders nothing. It computes everything a field's UI needs —
value, label, gated error, options, required — and hands it to a
*renderer*: a component you map to each field type. The included
`@react-form-engine/renderers-html` package maps every built-in type to
accessible native HTML; swap it for your design system whenever you like,
without touching a schema.

```tsx
import { Form, FormRenderers } from "@react-form-engine/core";
import { htmlRenderers } from "@react-form-engine/renderers-html";
import "@react-form-engine/renderers-html/styles.css"; // optional

function ProjectForm() {
  const bundle = useFormEngine(/* ... */);
  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <Form.AutoFields />
      </Form>
    </FormRenderers>
  );
}
```

`FormRenderers` provides the field-type → renderer map through context.
Nested providers merge over outer ones, so an app-wide map can be extended
or overridden for one form, or one section of one form.

## AutoFields and explicit placement

`Form.AutoFields` renders every resolved field in schema order — for many
forms, the entire layout. When a field needs a specific place in custom
markup, place it explicitly:

```tsx
<Form form={bundle}>
  <header>
    <Form.Field name="name" />
  </header>
  <Form.AutoFields />
</Form>
```

An explicit `Form.Field` *claims* its name, and `AutoFields` skips claimed
fields — no double rendering, no bookkeeping. `AutoFields` also accepts
`except` (names to skip) and `filter` for coarser control.

Placement is layout, nothing more. A field that appears nowhere still
parses, validates, and serializes; a field hidden by a
[rule](./rules) renders nothing even when placed. Layout decides *where*,
the engine decides *whether*.

## The renderer contract

A renderer is a component receiving `FieldRenderProps`:

| Prop | What it is |
| --- | --- |
| `value` | The form value (rows for lists). Narrow it for your type. |
| `setValue` | User-channel write — dirties the form. Lists take plain items. |
| `markTouched` | Call on blur; opens the error display gate. |
| `presentation` | The gated error, per-cell errors, and the raw `invalid` flag. |
| `required` | Derived from validation — drive the marker and `aria-required`. |
| `options` | Engine-set options, falling back to the definition's config items. |
| `definition` | The resolved definition: label, description, config. |
| `messages` | The merged [messages](./localization) object. |

Everything is computed; a renderer never reaches back into the engine, and
never decides *when* an error shows — displaying `presentation.error` when
present is the complete error story. A minimal text renderer is honestly
this small:

```tsx
function TextRenderer(props: FieldRenderProps) {
  return (
    <label>
      {props.definition.label}
      <input
        value={props.value as string}
        onChange={(e) => props.setValue(e.target.value)}
        onBlur={props.markTouched}
      />
      {props.presentation.error && <span>{props.presentation.error}</span>}
    </label>
  );
}
```

Design-system adapters are prop mappings in the same shape — MUI's
`TextField` takes `error`, `helperText`, and `onBlur`, and the contract
lines up one-to-one. List renderers build on `useListField` instead of
`value`/`setValue`; see [The row model](./row-model).

## Custom markup for one field

For a one-off — a field that needs bespoke markup without registering a
renderer — `Form.Field` takes a function child receiving the same props:

```tsx
<Form.Field name="summary">
  {(api) => (
    <textarea
      value={api.value as string}
      onChange={(e) => api.setValue(e.target.value)}
      onBlur={api.markTouched}
    />
  )}
</Form.Field>
```

The function is hosted as a component body, so hooks are legal inside it.

## Typed placement

`Form.Field` accepts any string; typos throw at runtime. For
compile-checked names, derive typed components from the bundle once:

```tsx
const { Field, AutoFields } = formComponentsFor(bundle);

<Field name="name" />        // ✓ checked against the field map
<Field name="nmae" />        // ✗ compile error
<AutoFields except={["kind"]} />
```

It's a zero-cost cast — the same components underneath.

## What the HTML renderers give you

`@react-form-engine/renderers-html` is both the out-of-the-box experience
and the reference implementation of the contract. Each renderer wraps its
control in `FieldFrame` — label association, description and error wired
through `aria-describedby`, `aria-invalid`, and a polite live region so
errors are announced without interrupting typing. Markup carries stable
`rfe-*` class names; styling is opt-in via the `styles.css` export and
themeable through CSS custom properties.

`FieldFrame` is exported for reuse: if you write a custom renderer over a
bare control, wrap it in `FieldFrame` and the accessibility plumbing comes
along. Design systems with their own field chrome (label/helper/error
built into the component) should use *theirs* instead — one chrome owner
per field, never two nested.
