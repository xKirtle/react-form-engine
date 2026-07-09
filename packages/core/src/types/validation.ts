import type { StandardSchemaV1 } from "./standardSchema";

/**
 * Rules available to every field regardless of type.
 *
 * The built-in vocabulary is deliberately data, not functions: the engine
 * and renderers introspect it (a `required` rule becomes the label asterisk
 * and `aria-required`; `maxLength` can become the input's own attribute),
 * and rule messages route through the localization layer. Logic that data
 * can't express goes in `custom`; arbitrary value-shape validation goes in
 * `schema`.
 */
export interface BaseValidation<TValue> {
  /** Rejects empty values. Pass an object to override the message. */
  required?: boolean | { message: string };
  /**
   * Cross-field-capable predicate. Returns a message to fail, nullish to
   * pass. Must be synchronous — async checks belong to the external-error
   * channel.
   */
  custom?: (
    value: TValue,
    formValues: Readonly<Record<string, unknown>>,
  ) => string | null | undefined;
  /**
   * Any Standard Schema v1 validator (Zod, Valibot, ArkType, ...) run
   * against the form-model value. The first issue's message becomes the
   * field error. Must validate synchronously.
   */
  schema?: StandardSchemaV1<TValue>;
}

export interface StringValidation extends BaseValidation<string> {
  minLength?: { value: number; message?: string };
  maxLength?: { value: number; message?: string };
  pattern?: { value: RegExp; message?: string };
}

export interface NumberValidation extends BaseValidation<number> {
  min?: { value: number; message?: string };
  max?: { value: number; message?: string };
}

/** `min`/`max` are ISO 8601 date strings, matching the date value domain. */
export interface DateValidation extends BaseValidation<string> {
  min?: { value: string; message?: string };
  max?: { value: string; message?: string };
}

export interface ListValidation<TItem> extends BaseValidation<TItem[]> {
  minItems?: { value: number; message?: string };
  maxItems?: { value: number; message?: string };
}

/**
 * The validation vocabulary a value domain implies. Field types get this
 * unless their registry entry declares an explicit vocabulary (e.g. `select`
 * narrows to {@link BaseValidation} — free-text rules make no sense on a
 * closed option set).
 */
export type DefaultValidationFor<TValue> = [TValue] extends [string]
  ? StringValidation
  : [TValue] extends [number]
    ? NumberValidation
    : [TValue] extends [readonly (infer TItem)[]]
      ? ListValidation<TItem>
      : BaseValidation<TValue>;
