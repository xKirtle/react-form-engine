import type { FieldMap } from "./fields";
import type { DeepKeys, DeepValue } from "./paths";

/**
 * The form-model value of one field definition: the transform's parse
 * output when a transform is present, the narrowed API value otherwise
 * (`NonNullable` — absence is handled at parse, so the form model never
 * holds `undefined` for a merely-optional API key).
 *
 * Implementation note: the transform is matched on its `parse` slot alone,
 * with a `never` parameter so any parse function unifies. Matching the full
 * `Transform` shape would place the inferred form value in `serialize`'s
 * parameter — a contravariant position — and break inference.
 */
export type FormValueOf<TApi, F> = F extends {
  transform: { parse: (apiValue: never) => infer TFormValue };
}
  ? TFormValue
  : F extends { key: infer K extends DeepKeys<TApi> }
    ? NonNullable<DeepValue<TApi, K>>
    : never;

/**
 * The full form model implied by a field map: field name → form value.
 * Modifiers are stripped — the schema literal is `readonly`, the values
 * object it implies is not.
 */
export type FormValuesOf<TApi, TFields extends FieldMap<TApi>> = {
  -readonly [N in keyof TFields]-?: FormValueOf<TApi, TFields[N]>;
};
