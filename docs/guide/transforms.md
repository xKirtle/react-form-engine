# Transforms

Your API model and your form model don't always agree. The API stores a
`Date`; the date input works with an ISO string. The API sends
`["ops", "billing"]`; the form edits key/value pairs. A transform is the
per-field bridge: a `parse`/`serialize` pair declared on the field
definition, run by the engine at the boundary in each direction.

```ts
interface Project {
  startedAt: Date;
  tags: string[];
}

const fields = {
  startedAt: {
    key: "startedAt",
    type: "date", // form value: ISO date string
    transform: {
      parse: (d) => d.toISOString().slice(0, 10),
      serialize: (iso) => new Date(iso),
    },
  },
  memberRoles: {
    key: "tags",
    type: "keyValueList", // form value: { key, value } entries
    transform: {
      parse: (api) => api.map((tag) => ({ key: tag, value: "" })),
      serialize: (entries) => entries.map((e) => e.key),
    },
  },
} as const satisfies FieldMap<Project>;
```

Both callbacks are fully typed from context: `parse` receives the API
value at `key`, `serialize` receives the field type's form value, and each
must return the other side. No annotations needed, and no cast can smuggle
a mismatch through.

## Required exactly when types disagree

Whether `transform` is optional or required is decided by the compiler,
not by convention. If the API value at `key` already fits the field type's
value domain, the transform slot is optional. If it doesn't — a `Date` on
a `date` field, a `string[]` on a `keyValueList` — the definition simply
does not typecheck without one.

This replaces the usual failure mode of conversion helpers: the mapping
that exists but wasn't called, or was called on the way in but not on the
way out. Here the conversion is part of the field's definition, the engine
applies it at parse and serialize, and forgetting it is a compile error.

When the types already match, you can still declare a transform to
normalize — trimming whitespace at serialize, for instance. That's a
choice; the engine only *demands* one when it must.

## Where transforms sit in the pipeline

Parsing runs at init and on `reset()`, per field:

1. Read the API value at `key` (module [defaults](./modules) have already
   filled absent paths).
2. If a value is present, run `transform.parse` on it.
3. If no value is present, use `defaultValue`; failing that, the type's
   empty value. `parse` is never called with a missing value.
4. For list types, wrap the items in [rows](./row-model).

Serialization runs the same steps in reverse: unwrap rows, drop blank list
items, run `transform.serialize`, then write the result at `key` — subject
to the field's `whenHidden` policy if it is hidden.

Two consequences worth internalizing:

- **Transforms never see rows.** Row identity and metadata belong to the
  engine; `parse` returns plain items and `serialize` receives plain
  items. A transform written for `keyValueList` works with
  `{ key, value }` objects, not with row wrappers.
- **`defaultValue` is a form-model value.** It stands in for the *output*
  of parsing, so on a transformed field it has the transformed shape.

## The round trip is complete

Serialization doesn't build a payload from scratch — it writes fields back
onto the object that was parsed. API properties no field binds to pass
through a parse/serialize round trip untouched, so a form that edits three
properties of a ten-property resource sends back all ten, unchanged where
the form didn't touch them.

## Keep them small

A transform is shape conversion, not business logic. It should be pure,
synchronous, and cheap — the engine may run it whenever it re-parses or
serializes. Logic that reacts to values ("when the kind changes, seed a
row") belongs in [rules](./rules); logic that validates belongs in
[validation](./validation). If a transform grows branches, it is usually
two of these three in a trench coat.
