import type { FieldMap } from "./fields";
import type { DeepKeys, DeepValue } from "./paths";
import type { FieldTypeName, FieldValueOf } from "./registry";
import type { ListRow } from "./rows";

/**
 * The unwrapped form-model value: the transform's parse output when a
 * transform is present, the narrowed API value otherwise (`NonNullable` —
 * absence is handled at parse, so the form model never holds `undefined`
 * for a merely-optional API key).
 *
 * Implementation note: the transform is matched on its `parse` slot alone,
 * with a `never` parameter so any parse function unifies. Matching the full
 * `Transform` shape would place the inferred form value in `serialize`'s
 * parameter — a contravariant position — and break inference.
 */
type RawFormValueOf<TApi, F> = F extends {
  transform: { parse: (apiValue: never) => infer TFormValue };
}
  ? TFormValue
  : F extends { key: infer K extends DeepKeys<TApi> }
    ? NonNullable<DeepValue<TApi, K>>
    : never;

/**
 * The form-model value of one field definition. List domains wrap their
 * items in {@link ListRow}s — row wrapping happens *after* transforms, so a
 * transform's `parse`/`serialize` (and `defaultValue`) work with plain
 * items while the engine owns row identity.
 *
 * @group Schema
 */
export type FormValueOf<TApi, F> = F extends {
  type: infer T extends FieldTypeName;
}
  ? FieldValueOf<T> extends readonly unknown[]
    ? RawFormValueOf<TApi, F> extends readonly (infer TItem)[]
      ? ListRow<TItem>[]
      : never
    : RawFormValueOf<TApi, F>
  : never;

/**
 * The value the write channel (`engine.setValue`) accepts for one field:
 * always the plain, unwrapped value — for lists, a plain item array. The
 * engine wraps items in rows and owns identity and provenance; callers
 * never construct rows.
 *
 * @group Schema
 */
export type FormWriteValueOf<TApi, F> = RawFormValueOf<TApi, F>;

/**
 * The full form model implied by a field map: field name → form value.
 * Modifiers are stripped — the schema literal is `readonly`, the values
 * object it implies is not.
 *
 * @group Schema
 */
export type FormValuesOf<TApi, TFields extends FieldMap<TApi>> = {
  -readonly [N in keyof TFields]-?: FormValueOf<TApi, TFields[N]>;
};
