# Rules & the engine API

_Every concept on this page runs live in [the demo](https://xkirtle.github.io/react-form-engine/demo/#/rules)._

Dynamic behavior climbs a ladder, and you only climb as high as a
requirement forces:

- **Rung 0 — static schema.** Definitions, validation data, defaults.
  Nothing moves.
- **Rung 1 — rules.** Declarative watchers with typed code inside: "when
  the kind is delegated, guarantee a pinned owner row."
- **Rung 2 — the engine API.** Imperative calls from page code, for
  behavior that reacts to the app rather than to form values: an import
  button, options arriving from a request.

Most forms live entirely on rung 0. This page is about the other two.

## Anatomy of a rule

```ts
const bc = formBuilder<Project>().withFields(fields).withContext<Ctx>();

const budgetVisibility = bc.rule({
  watch: ["kind"],
  when: (kind) => kind === "funded",
  apply: (form) => form.setVisible("budget", true),
  otherwise: (form) => form.setVisible("budget", false),
});

const ownerSeeding = bc.rule({
  watch: ["kind"],
  when: (kind) => kind === "delegated",
  apply: (form, ctx) => {
    form.ensureRows("memberRoles", [{
      match: { key: "owner" },
      value: { key: "owner", value: ctx.defaultOwner },
      meta: { pinned: true },
    }]);
  },
  otherwise: (form) => {
    form.removeRows("memberRoles", { origin: "seeded" });
  },
});
```

`watch` names the fields the rule cares about, and everything infers from
it: `when` receives the watched values, positionally typed; `apply` and
`otherwise` receive the engine API plus the form's context. There is no
condition language to learn — `when` is a function, and the compiler will
tell you that `kind === "archived"` can never be true if `"archived"`
isn't in the union.

Rules attach to forms through [modules](./modules), so a slice of fields
travels with the behavior that belongs to it.

## When rules run

A rule is evaluated when a watched value *changes* — not on every form
tick. Within an evaluation:

- If the condition holds (or there is no `when`), **`apply` runs** — and
  runs again on every watched change while the condition keeps holding.
  Derivation rules depend on this: recompute the summary every time the
  inputs move.
- **`otherwise` runs once, on the transition to false.** It is the release
  hook — undo what `apply` established, as `ownerSeeding` does above — not
  a continuous "else branch".
- **The initial pass counts as a transition in both directions.** Rules
  run right after parsing, so a form loaded with `kind: "funded"` shows
  its budget from the first paint, and one loaded without it starts
  hidden. Rule effects on initial data *are* initial data — validation
  snapshots are taken after this pass.

Rules may write fields other rules watch. The engine keeps evaluating
until a pass changes nothing, so chains settle within one user-visible
update; writing the same value twice short-circuits, and a rule that keeps
*changing* a field it watches is cut off with an error naming the likely
culprit.

## Rule writes never dirty the form

`isDirty` answers "has the user changed something?" — it drives unsaved-
changes warnings, and a warning that cries wolf gets ignored. Rule writes
are derived state: recomputable from initial data, user edits, and
context. Losing them loses nothing, so they don't count.

This is safe because of causality: a rule only fires when a watched value
changed, and if the *user* caused that change, the form is already dirty
from the edit itself. The two cases where a rule fires without a user
action — the initial pass and a context change — are exactly the cases
where a pristine form is the correct answer. An edit form with an
init-time rule opens clean, as it should.

## Visibility

`setVisible` is engine-owned state, not conditional rendering. A hidden
field:

- renders nothing — `Form.AutoFields` skips it and an explicit
  `Form.Field` renders null;
- is excluded from validation entirely, `required` included;
- keeps its value — hiding is not clearing;
- serializes according to its `whenHidden` policy.

That last point is a real decision, so it's a per-field knob:

| `whenHidden` | The payload gets |
| --- | --- |
| `"omit"` (default) | no key at all |
| `"null"` | an explicit `null` |
| `"keep"` | the current value, hidden or not |

A form-level default can be set with `useFormEngine({ hiddenValues })`.
Note the direction of ownership: placement in JSX is layout, visibility is
engine state. A field nobody renders still parses, validates, and
serializes — a field that's *hidden* does not.

## Rung 2: the engine API

The same surface rules receive is available on the bundle for page code:

```ts
bundle.engine.getValue("kind");
bundle.engine.setValue("budget", 25000);
bundle.engine.ensureRows("memberRoles", [...]);   // see The row model
bundle.engine.removeRows("memberRoles", { origin: "seeded" });
bundle.engine.setOptions("assignee", usersFromRequest);
bundle.engine.setServerError("name", "Already taken"); // see Validation & errors
bundle.engine.setVisible("budget", false);
bundle.reset(freshApiValues);
```

Everything is typed against the field map — values, row items, names.
Reads return the form model (lists come back as [rows](./row-model));
writes take plain values, and the engine owns row identity.

One difference separates the two callers. Page-code writes are *user
channel*: they dirty the form, and rows they create are `origin: "user"`.
The identical calls inside a rule are *derived channel*: never dirtying,
rows stamped `origin: "seeded"`. You don't choose a channel — it follows
from where the call is made, so provenance can't lie.

`setOptions` is the async-options story: fetch wherever your data layer
likes, then hand the engine the option list. Select renderers pick it up
reactively. The engine deliberately doesn't fetch — it owns the *state*,
your app owns the request.

## Choosing a rung

Reach for a rule when behavior reacts to *form values* — visibility that
follows a field, rows that a choice implies, a derived value. Reach for
the engine API when behavior reacts to *the app* — a template button, an
import flow, options arriving, a server rejecting a name. If you're
reaching for the engine API inside a `useEffect` that watches form values,
that's a rule wearing a disguise; let the engine run it instead.
