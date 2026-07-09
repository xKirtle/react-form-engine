/**
 * The runtime half of a field type — what the engine needs to know beyond
 * the type level. Custom field types provide one of these alongside their
 * registry augmentation.
 *
 * @group Field types
 */
export interface FieldTypeRuntime {
  /**
   * Present for list-valued types: the field participates in the row
   * model. The blank/complete heuristics default to string-cell checks;
   * types with non-string cells supply their own.
   */
  list?: {
    isBlankItem?: (item: unknown) => boolean;
    isCompleteItem?: (item: unknown) => boolean;
  };
  /**
   * The value a field holds when the API provides none and no
   * `defaultValue` is set. Absence never reaches the form model.
   */
  emptyValue?: () => unknown;
}

/**
 * Built-in runtimes. Note `number`: its empty value is `NaN` — the only
 * "no value yet" that is honestly a number. It is what an empty native
 * number input yields (`valueAsNumber`), `required` validation treats it
 * as missing, and serialization omits it.
 */
export const builtinFieldTypeRuntimes: Record<string, FieldTypeRuntime> = {
  text: { emptyValue: () => "" },
  number: { emptyValue: () => Number.NaN },
  date: { emptyValue: () => "" },
  checkbox: { emptyValue: () => false },
  select: { emptyValue: () => "" },
  stringList: { list: {}, emptyValue: () => [] },
  keyValueList: { list: {}, emptyValue: () => [] },
};
