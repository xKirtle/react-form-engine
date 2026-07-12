# Validation & errors

_Every concept on this page runs live in [the demo](https://xkirtle.github.io/react-form-engine/demo/#/validation)._

Validation is two separate questions, and the engine keeps them separate
on purpose:

1. **Is this value acceptable?** Computed continuously, for every resolved
   field, whether or not anything is rendered. This is *raw validity*.
2. **Should the user see the error right now?** That's *display policy* —
   a decision about moments, not correctness.

Most form code fuses these into one boolean and then fights the fusion
forever. Here they have different owners: rules and schemas answer the
first, the display gate answers the second, and renderers just show what
they're handed.

## The rule vocabulary

Rules are data, declared per field, drawn from the field type's own
vocabulary:

```ts
const fields = {
  name: {
    key: "name",
    type: "text",
    validation: {
      required: true,
      maxLength: { value: 40 },
      pattern: { value: /^[\w ]+$/, message: "Letters and spaces only" },
    },
  },
  budget: {
    key: "budget",
    type: "number",
    validation: { min: { value: 0 } },
  },
  tags: {
    key: "tags",
    type: "stringList",
    validation: { minItems: { value: 1 } },
  },
} as const satisfies FieldMap<Project>;
```

Text fields offer length and pattern rules; numbers offer bounds; dates
offer ISO-string bounds; lists count their (non-blank) items. The compiler
enforces the vocabulary — `maxLength` on a number field is a type error.
Each rule takes an optional `message` that beats the built-in one.

The vocabulary is deliberately data rather than functions, because the
engine *reads* it: `required` becomes the label's marker and
`aria-required`, and renderers can derive native attributes from bounds.
An empty value fails `required` and nothing else — range rules don't pile
onto a field the user simply hasn't filled in. ("Empty" per type: a
blank-after-trim string, `NaN`, an unchecked required checkbox, a list
with no non-blank rows.)

## Custom checks and schemas

Two universal slots cover what data can't express:

```ts
budget: {
  key: "budget",
  type: "number",
  validation: {
    // cross-field: sees the whole form's values
    custom: (budget, values) =>
      values.kind === "funded" && budget <= 0
        ? "Funded projects need a budget"
        : null,
    // any Standard Schema validator: Zod, Valibot, ArkType, ...
    schema: z.number().int().multipleOf(100),
  },
},
```

`custom` returns a message to fail, nullish to pass, and its error lands
on the field that declares it — cross-field checks stay attributed.
`schema` accepts any [Standard Schema](https://standardschema.dev)
validator with zero dependencies; the first issue's message becomes the
field error. For lists, both receive the plain non-blank items, not row
wrappers.

Both must be synchronous. A schema that returns a Promise is a runtime
error pointing at the right tool: async verdicts belong to the server
error channel below.

## The display policy

Raw validity updates on every keystroke; *showing* errors follows gates:

- **Each field has a touch gate.** Errors stay hidden until the field's
  first blur. The gate then stays open: from that point the field's
  feedback is live — fix the value mid-keystroke and the error clears,
  break it again and it returns. No mid-composition scolding on a first
  entry; instant confirmation while correcting a known problem.
- **Submitting opens every gate.** `handleSubmit` marks the form
  submitted, reveals everything, and only calls your `onSubmit` when raw
  validity passes.
- **Initial errors follow `initialErrors`.** With `"eager"` (the
  default), data that arrived invalid from the API is flagged immediately
  — right for edit forms, where late discovery is the annoyance. With
  `"gated"`, initial errors wait for the gates like everything else —
  right for create forms, which shouldn't open as a wall of red. The
  create/edit split is the rule of thumb:

```ts
initialErrors: isNew ? "gated" : "eager",
```

Raw validity is always inspectable regardless of gating —
`bundle.validation.isValid()` for the form, `presentation.invalid` per
field — which is what submit buttons and validity indicators should read.
An invalid field with no visible error is the display policy working, not
a bug.

## Server errors

Some verdicts only the outside world can give: a uniqueness check, a
rejected save. Pin them onto a field:

```ts
try {
  await saveProject(project);
} catch (e) {
  if (isNameConflict(e)) {
    bundle.engine.setServerError("name", "Name already taken");
  }
}
```

Pinned errors show immediately — no touch gate; the user did nothing to
deserve suspense — and clear automatically the moment the field's value
changes, because an edit invalidates the old verdict. For conflicts that
resolve without the user typing (the other record was renamed),
`clearServerError` lifts the pin explicitly.

This channel is also the async-validation story. The engine's own pass is
synchronous by design; debounce, cancellation, and caching belong to your
data layer. Run the check wherever requests live, then pin or clear the
result.

## Lists error per cell

List fields validate at two grains. Field-level rules (`minItems`,
`custom`, `schema`) produce a field error like any other. Row completeness
produces *cell* errors: a row someone started but left half-filled errors
on its empty cells, addressed by row and column, gated by per-cell touch.
Blank rows — placeholders nobody filled — are invisible to validation
entirely and dropped at serialize. The mechanics live in
[The row model](./row-model).

## Where errors surface

Renderers receive a computed presentation: the gated error string (or
per-cell map), plus the raw `invalid` flag. They never decide *when* — a
renderer that shows `presentation.error` when present is complete. The
included [HTML renderers](./rendering) announce errors through polite live
regions and wire the ARIA plumbing; custom renderers get the same
presentation object and can be exactly as simple.
