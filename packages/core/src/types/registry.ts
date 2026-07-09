import type {
  BaseValidation,
  DateValidation,
  DefaultValidationFor,
} from "./validation";

/**
 * The type-level shape of one field type: the value domain fields of this
 * type hold in the form model, the configuration object their definitions
 * accept, and the validation vocabulary they offer.
 *
 * The validation slot defaults from the value domain (a `number`-valued
 * type gets `min`/`max` for free), so most registrations only state value
 * and config. Declare the third parameter to narrow or extend it.
 */
export interface FieldTypeSpec<
  TValue,
  TConfig = undefined,
  TValidation extends BaseValidation<TValue> = DefaultValidationFor<TValue> &
    BaseValidation<TValue>,
> {
  value: TValue;
  config: TConfig;
  validation: TValidation;
}

/** An option in a `select` field. */
export interface SelectItem {
  label: string;
  value: string;
}

/** One entry of a `keyValueList` field. */
export interface KeyValueEntry {
  key: string;
  value: string;
}

/**
 * All known field types. The engine ships the built-ins; consumers register
 * custom types by augmenting this interface:
 *
 * ```ts
 * declare module "@react-form-engine/core" {
 *   interface FieldTypeRegistry {
 *     rating: FieldTypeSpec<number, { max: number }>;
 *   }
 * }
 * ```
 *
 * A registered type participates in every contract a built-in does: key
 * binding against the API model, transform requirements, validation, and
 * renderer lookup.
 *
 * Note: `date` deliberately holds an ISO 8601 string, not a `Date` — API
 * models overwhelmingly exchange dates as strings, and binding a `Date`-typed
 * key to a date field then requires an explicit transform.
 */
export interface FieldTypeRegistry {
  text: FieldTypeSpec<string>;
  number: FieldTypeSpec<number>;
  date: FieldTypeSpec<string, undefined, DateValidation>;
  checkbox: FieldTypeSpec<boolean>;
  select: FieldTypeSpec<
    string,
    { items?: readonly SelectItem[] },
    BaseValidation<string>
  >;
  stringList: FieldTypeSpec<string[]>;
  keyValueList: FieldTypeSpec<KeyValueEntry[]>;
}

/** The name of a registered field type. */
export type FieldTypeName = keyof FieldTypeRegistry;

/** The form-model value domain of a field type. */
export type FieldValueOf<TType extends FieldTypeName> =
  FieldTypeRegistry[TType]["value"];

/** The configuration object a field type's definitions accept. */
export type FieldConfigOf<TType extends FieldTypeName> =
  FieldTypeRegistry[TType]["config"];

/** The validation vocabulary a field type offers. */
export type FieldValidationOf<TType extends FieldTypeName> =
  FieldTypeRegistry[TType]["validation"];
