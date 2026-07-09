/**
 * The type-level shape of one field type: the value domain fields of this
 * type hold in the form model, and the configuration object their
 * definitions accept.
 */
export interface FieldTypeSpec<TValue, TConfig = undefined> {
  value: TValue;
  config: TConfig;
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
  date: FieldTypeSpec<string>;
  checkbox: FieldTypeSpec<boolean>;
  select: FieldTypeSpec<string, { items?: readonly SelectItem[] }>;
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
