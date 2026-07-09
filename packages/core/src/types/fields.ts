import type { DeepKeys, DeepValue } from "./paths";
import type {
  FieldConfigOf,
  FieldTypeName,
  FieldValidationOf,
  FieldValueOf,
} from "./registry";

/**
 * Converts one field's value between the API model and the form model.
 * `parse` runs at init/reset, `serialize` on the way back out.
 *
 * A definition whose API value already fits its field type's domain may
 * omit the transform; one whose types differ is *required* to provide it —
 * the compiler enforces the boundary, so no cast can smuggle a mismatch
 * past it.
 */
export interface Transform<TApiValue, TFormValue> {
  parse: (apiValue: TApiValue) => TFormValue;
  serialize: (formValue: TFormValue) => TApiValue;
}

type ConfigSlot<T extends FieldTypeName> =
  FieldConfigOf<T> extends undefined
    ? { config?: undefined }
    : { config?: FieldConfigOf<T> };

/**
 * The transform/defaultValue pair for one (API value, domain) binding.
 *
 * Matching is checked against `NonNullable` of the API value: an optional
 * API value binds without a transform, because absence is handled at parse
 * (`defaultValue`, or the type's empty value) — a typing concern would add
 * a transform tax on every optional key for no safety.
 *
 * When the types match, the form-model value keeps the API value's narrower
 * type (a `"private" | "public"` key on a select field stays that union),
 * so `defaultValue` — a form-model value — is typed accordingly.
 */
type ValueSlots<TApiValue, TDomain> = [NonNullable<TApiValue>] extends [TDomain]
  ? {
      transform?: Transform<TApiValue, NonNullable<TApiValue>>;
      defaultValue?: NonNullable<TApiValue>;
    }
  : {
      transform: Transform<TApiValue, TDomain>;
      defaultValue?: TDomain;
    };

/** A field definition for one specific key and field type. */
export type FieldDefinitionFor<
  TApi,
  K extends DeepKeys<TApi>,
  T extends FieldTypeName,
> = {
  key: K;
  type: T;
  label?: string;
  description?: string;
  validation?: FieldValidationOf<T>;
} & ConfigSlot<T> &
  ValueSlots<DeepValue<TApi, K>, FieldValueOf<T>>;

/**
 * Any valid field definition against an API model: the union of every
 * (addressable key × registered field type) combination. Definitions are
 * checked against it with `satisfies`, where the `key`/`type` discriminants
 * select the combination and excess property checking enforces its slots.
 */
export type FieldDefinition<TApi> = {
  [K in DeepKeys<TApi>]: {
    [T in FieldTypeName]: FieldDefinitionFor<TApi, K, T>;
  }[FieldTypeName];
}[DeepKeys<TApi>];

/**
 * A form's field vocabulary: definitions by field name. The name is the
 * field's identity everywhere (modules, rendering, engine API); the
 * definition's `key` is the API path it binds to. They often coincide, but
 * a nested or unwieldy path can sit behind a friendlier name.
 *
 * ```ts
 * const fields = {
 *   visibility: { key: "settings.visibility", type: "select" },
 * } as const satisfies FieldMap<Project>;
 * ```
 */
export type FieldMap<TApi> = Record<string, FieldDefinition<TApi>>;
