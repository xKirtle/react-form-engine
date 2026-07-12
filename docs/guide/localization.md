# Localization

_Every concept on this page runs live in [the demo](https://xkirtle.github.io/react-form-engine/demo/#/localization)._

Every string the engine generates — validation messages, list mechanics,
the accessible names on row buttons — routes through one `EngineMessages`
object. Nothing is hardcoded past it, so localizing a form means providing
one object, not hunting strings.

The dividing line is authorship: **the engine translates what it authors;
what you author, you translate.** A default `required` message exists in
no file you own, so it must have an override channel — that channel is
`messages`. Your labels, descriptions, and per-field messages already live
in your codebase, so they never need one.

```ts
import type { EngineMessagesOverride } from "@react-form-engine/core";

const portuguese: EngineMessagesOverride = {
  validation: {
    required: "Este campo é obrigatório",
    maxLength: (max) => `Máximo de ${max} caracteres`,
  },
  lists: {
    add: "Adicionar item",
    remove: (rowName) => `Remover ${rowName}`,
    rowName: (position, key) =>
      key === undefined ? `linha ${position}` : `linha ${position} (${key})`,
  },
};

const bundle = useFormEngine<Project, undefined, typeof fields>({
  fields,
  messages: portuguese,
  // ...
});
```

Overrides are partial and merge per message: anything you don't name keeps
its English default. Parameterized messages are functions rather than
template strings, so each locale controls its own word order and
pluralization — `minItems: (min) => ...` can say "Add at least 2 items" or
"Adicione pelo menos 2 itens" without placeholder gymnastics.

## What's covered

- **`validation`** — the built-in rule messages: `required`, length and
  bound rules, `pattern`, item counts. Messages from `custom` checks and
  `schema` validators are yours already — write them localized at the
  source.
- **`lists`** — the list renderers' mechanics: the add button, remove
  buttons, and `rowName`, which builds the row identifier embedded in
  accessible names ("Remove row 2 (owner)"). Screen-reader output
  localizes with everything else.

## Precedence

A message is resolved most-specific-first:

1. **Explicit per-field text** — a rule's own `message`
   (`maxLength: { value: 12, message: "Keep it short" }`) always wins.
2. **The form's `messages` option** — the locale override above.
3. **English defaults.**

Per-field messages sit *above* the locale — authorship again: a
hand-written `message` is your string, and the engine never rewrites
yours. That cuts both ways: they're the right place for wording that is
genuinely field-specific, and the wrong place for anything a locale
switch should reach. If your app is
multilingual, prefer the vocabulary's default messages (localized once, in
`messages`) and reserve per-field `message` for text you localize at the
definition site.

## Field labels are yours

`label` and `description` are your content, not engine output — the
authorship rule again. You wrote these strings, so you can already
translate them, and a second channel through the engine would only
compete with the i18n setup you have. Localize them the way you localize
any app copy: define maps per locale, or run your i18n library's
translate over them as you build the map — `label: t("project.name")`
composes naturally, because pass-through is the whole contract. The
engine only insists on one thing: whatever you hand it is what renders.

## Switching locale at runtime

Messages are read when the form is created. If the locale can change while
a form is open, remount the form with a `key`:

```tsx
<ProjectForm key={locale} locale={locale} />
```

A locale switch mid-edit is rare enough that the remount (and the reset it
implies) is usually the right behavior anyway — but it's a real
limitation, worth knowing before you design a language toggle inside a
form.
