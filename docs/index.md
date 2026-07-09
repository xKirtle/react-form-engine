---
layout: home

hero:
  name: react-form-engine
  text: Schemas for vocabulary, code for logic
  tagline:
    Data-driven forms for React, built on TanStack Form. The engine owns
    parsing, validation, visibility, and serialization — rendering stays
    headless.
  actions:
    - theme: brand
      text: Get started
      link: /guide/quickstart
    - theme: alt
      text: View on GitHub
      link: https://github.com/xKirtle/react-form-engine

features:
  - title: Typed field schemas
    details:
      Fields are plain data bound to your API model. A misspelled key or a
      mismatched type is a compile error, and a type mismatch requires a
      transform — enforced by the compiler, not convention.
  - title: Composable modules
    details:
      Form variants (create/edit, per plan, per feature) share one
      definition instead of drifting copies, assembled per context at
      runtime.
  - title: Typed rules
    details:
      Dynamic behavior — "when X changes, seed/show/clear Y" — without
      useEffect chains or a JSON condition language. Rule writes never
      dirty the form.
  - title: Error display policy
    details:
      Errors show on touch, on submit, or immediately for data that arrived
      invalid from the API. Raw validity and displayed errors are separate,
      by design.
  - title: List row model
    details:
      Rows carry stable identity, provenance (API, rule, or user?), and
      metadata like pinned or read-only — owned by the engine, so list UI
      cannot desync from list state.
  - title: Headless rendering
    details:
      Schema-bound components with pluggable renderer maps. Accessible
      native HTML renderers included; bring your own design system.
---
