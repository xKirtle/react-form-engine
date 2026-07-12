# Modules & context

_Every concept on this page runs live in [the demo](https://xkirtle.github.io/react-form-engine/demo/#/modules)._

A [field map](./field-definitions) is a vocabulary; a module is a sentence
built from it. Each module selects fields by name and can bring overrides,
[rules](./rules), and defaults along. A form is a list of modules, and
that's how near-identical form variants share one definition instead of
drifting apart as copies.

```ts
const b = formBuilder<Project>().withFields(fields);

const basics = b.module({
  fields: ["name", "kind", "launchDate"],
});

const financials = b.module({
  fields: ["budget", "costCenter"],
  rules: [budgetVisibility],
});

const bundle = useFormEngine<Project, undefined, typeof fields>({
  fields,
  modules: [basics, financials],
  context: undefined,
  // ...
});
```

The builder's `module` method exists for inference: selections, overrides,
and rules are all checked against the field map, so a typo'd name is a
compile error.

## How modules resolve

At form creation the modules flatten into a *resolved schema* — the fields
this instance actually has, the rules that run, the defaults that apply.
Three ordering rules govern it:

- **Inclusion is first-appearance.** Fields render (and serialize) in the
  order modules first mention them. Mentioning a field twice doesn't
  duplicate it.
- **Property merges are last-wins.** Later overrides and later defaults
  beat earlier ones.
- **Overrides are position-independent.** A module may override a field it
  doesn't include; the override applies as long as *some* module includes
  the field. Overrides for fields nobody includes are ignored.

Unknown names — in selections or override targets — throw at resolution,
immediately and loudly. A misassembled form fails at creation, not at
submit.

## Overrides

An override adjusts any definition slot except `key` and `type` — those
are the field's identity, and changing them would silently change what the
field *is*. Everything else is fair game: label, description, validation,
config, defaults.

```ts
const strictFinancials = b.module({
  fields: ["budget"],
  overrides: {
    budget: {
      label: "Budget (EUR)",
      validation: { required: true, min: { value: 0 } },
    },
  },
});
```

Merging is shallow: an overridden `validation` replaces the definition's
validation as a unit, it doesn't merge rule by rule. Overrides speak the
field's own vocabulary — putting `maxLength` on a number field is a
compile error, same as in the map itself.

## Context and factories

Context is read-only data the form is created with — the plan tier, the
user's role, feature flags. Modules become context-aware through the
builder:

```ts
interface ProjectFormCtx {
  tier: "starter" | "pro";
}

const bc = b.withContext<ProjectFormCtx>();

// a factory: consulted at resolution, may opt out entirely
const billing = bc.moduleFactory((ctx) =>
  ctx.tier === "pro"
    ? { fields: ["budget", "invoiceEmail"], defaults: { currency: "EUR" } }
    : null,
);
```

A factory runs once per resolution and returns a module or `null`. This is
the mechanism for form variants: the `modules` list stays declarative, and
the context decides what materializes. A record of module lists keyed by
variant is just data — no registry machinery needed.

Rules and modules built *without* a context (plain `b.rule`, `b.module`)
work in any form whose context extends theirs, so shared behavior doesn't
need to be duplicated per variant.

## When context changes mid-life

Context is compared by identity. When it changes — feature flags finish
loading, the user switches a tier — the engine re-resolves the modules and
swaps the schema *in place*, on the same form instance:

- Fields joining the schema parse in from the original API values.
- Fields leaving keep their values quietly but stop rendering, validating,
  and serializing.
- Display state survives: touched fields stay touched, a submit attempt
  stays counted, pinned server errors stay pinned.
- The form's dirty state is untouched — a context switch is not a user
  edit.

The practical consequence: you can drive context from live app state
without the form forgetting where the user was. Only `reset()` starts
over.

## Defaults

A module's `defaults` are API-model values by path, applied at parse
wherever the incoming data has none:

```ts
const billing = bc.moduleFactory((ctx) =>
  ctx.tier === "pro"
    ? { fields: ["budget"], defaults: { currency: "EUR" } }
    : null,
);
```

`currency` here has no field definition at all — nothing renders it,
nothing edits it — yet it parses in and serializes out with the rest of
the payload. That's the point: a module can guarantee a submitted value
as part of its slice, without inventing a hidden field to carry it.
