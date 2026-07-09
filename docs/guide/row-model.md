# The row model

Editable lists are where form state usually falls apart. Arrays force
index-based React keys that shuffle on removal; "this row can't be
deleted" ends up in a second data structure that drifts out of sync; and
once a rule and a user both add entries, nobody can say which rows are
whose. The row model is the engine's answer: list values are lists of
*rows*, and a row is one immutable object —

```ts
interface ListRow<TItem> {
  readonly id: string;      // engine-generated, stable for the row's life
  readonly value: TItem;    // the actual item
  readonly origin: "api" | "seeded" | "user";
  readonly meta: RowMeta;   // pinned, keyReadOnly, your own flags
}
```

Value and metadata live in the same object, so they cannot desync. Updates
replace the row rather than mutating it; identity survives every edit.

Rows exist only in the form model. Transforms work with plain items,
`serialize()` unwraps rows back to plain arrays, and your API never sees
them.

## Provenance: rows know where they came from

`origin` is stamped by the channel a row entered through, and nothing can
change it afterwards:

| Origin | Stamped when |
| --- | --- |
| `"api"` | parsing created the row from incoming data |
| `"seeded"` | a rule or engine call created it via `ensureRows` |
| `"user"` | the list UI's `add` created it |

Provenance is what makes machine-managed rows safe to mix with human ones.
`removeRows("memberRoles", { origin: "seeded" })` cleans up exactly what
seeding created and cannot touch a row the user typed. A renderer can
label or style rows by origin. And because the stamp is applied by the
entry channel itself — never passed in by the caller — provenance can't
lie.

## Meta: flags that travel with the row

`meta` carries flags the engine understands plus anything you add.
Two built-ins matter:

- **`pinned`** disables the removal affordance — and only that. A pinned
  row can still be edited.
- **`keyReadOnly`** locks a keyValueList's key cell — and only that. The
  value stays editable.

The two are deliberately separate: "must exist" and "must not be renamed"
are different guarantees, and conflating them makes seeded-but-editable
rows impossible to express. Renderers read these flags; the engine doesn't
enforce them beyond the UI, because they are affordances, not permissions.

## Seeding is a lease

`ensureRows` doesn't add rows — it *guarantees* them:

```ts
form.ensureRows("memberRoles", [{
  match: { key: "owner" },
  value: { key: "owner", value: ctx.defaultOwner },
  meta: { pinned: true },
}]);
```

For each spec, the engine looks for an existing row matching `match`
(falling back to the whole `value`). If one exists, it is **adopted**: the
meta is stamped on, and the row's value and origin stay untouched. If none
exists, a `"seeded"` row is created with `value`. Either way the spec now
holds a lease on that row, and repeating the call is a no-op — even if the
user has since edited the row past matching. Adoption is checked once, not
subscribed to.

Adoption is the part that surprises people, so to be plain: if the user
already typed an owner row and *then* the rule fires, the rule does not
overwrite their value with its default. It pins what the user wrote. A
seed spec's `value` is only for rows that don't exist yet. The rule's job
is "an owner row exists and can't be removed" — a structural guarantee,
not ownership of the content.

Releasing mirrors it exactly. `removeRows(name, { origin: "seeded" })`
deletes the rows seeding *created*, and for rows seeding *adopted* it
strips only the stamped meta — the pin lifts, the user's row and every
edit they made survive. This is the standard `otherwise` of a seeding
[rule](./rules): apply guarantees, otherwise releases them, and user data
passes through both unharmed.

## knownRows: metadata the schema already knows

Some rows deserve flags the moment they arrive from the API — the `owner`
entry that should never be removable, in any form over this model. That's
`knownRows`, declared on the field definition:

```ts
memberRoles: {
  key: "memberRoles",
  type: "keyValueList",
  knownRows: [{ match: { key: "owner" }, meta: { pinned: true } }],
},
```

At parse, matching incoming rows get the meta stamped. Unlike seeding this
is adopt-only — nothing is created if no row matches — and permanent: it
is not a lease, so a rule releasing its seeded rows never strips it. Use
`knownRows` for facts about the data ("owners are pinned"), `ensureRows`
for behavior ("delegated projects get an owner").

## Blank rows and completeness

A row whose string cells are all empty is *blank* — a placeholder someone
added but never filled. Blank rows are invisible to
[validation](./validation) (`required` and `minItems` count past them) and
dropped at serialize, so a stray empty row never blocks a save or pollutes
a payload.

A row that is started but unfinished — key filled, value empty — is
*incomplete*, and errors on its empty cells, addressed by row id and
column, revealed by per-cell touch. `useListField`'s `canAdd` is false
while any row is incomplete, which keeps add buttons from stacking blanks.

## Lists in the UI

The included [list renderers](./rendering) cover the built-in list types.
For custom list UIs, `useListField` exposes the whole model — items with
identity, origin, meta, per-cell errors, and mechanics (`update`,
`remove`, `add`, `markCellTouched`) — see its API reference for a complete
example.

Two closing notes on writes. `engine.setValue(name, items)` takes *plain
items* and replaces the list wholesale with fresh identity — callers never
construct rows, and the engine keeps identity for row-level edits, which
go through `update` instead. And string lists are rows too (stable keys,
per-item gating) but can't be seeded — with a single cell there's nothing
to `match` on or lock, so `ensureRows` accepts only object-item lists, at
compile time.
