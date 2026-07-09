# @react-form-engine/renderers-html

## 0.1.0

### Minor Changes

- 21f6358: Initial release.

  `@react-form-engine/core`: the engine — typed field schemas bound to your
  API model, composable modules with context-driven factories, per-field
  transforms (compiler-required on type mismatch), typed rules, engine-owned
  visibility with per-field `whenHidden` policies, a list row model with
  identity/provenance/metadata, validation with an explicit display policy
  (`eager`/`gated`, touch and submit gates, server errors), localizable
  engine messages, and headless rendering with pluggable renderer maps.

  `@react-form-engine/renderers-html`: accessible renderers for every
  built-in field type on native HTML elements, plus the reusable
  `FieldFrame` chrome and an opt-in stylesheet.
