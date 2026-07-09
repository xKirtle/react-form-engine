import type { FieldMap } from "./fields";
import type { SelectItem } from "./registry";
import type { ListRow, RowListKeys, RowOrigin, RowSeedSpec } from "./rows";
import type { FormValueOf, FormWriteValueOf } from "./values";

/** The item type behind a row-list field's rows. */
type RowItemOf<TApi, TFields extends FieldMap<TApi>, N extends keyof TFields> =
  FormValueOf<TApi, TFields[N]> extends ListRow<infer TItem>[] ? TItem : never;

/**
 * The imperative engine surface — rung 2 of the knob ladder. Rules receive
 * it scoped (their writes are stamped as rule-originated and never dirty
 * the form); page code reaches it on the form bundle.
 *
 * Reads return the form model (lists as rows); writes take plain values —
 * the engine owns row identity and provenance, so callers never construct
 * rows.
 *
 * @group Engine
 */
export interface FormEngineApi<TApi, TFields extends FieldMap<TApi>> {
  getValue<N extends keyof TFields & string>(
    name: N,
  ): FormValueOf<TApi, TFields[N]>;

  setValue<N extends keyof TFields & string>(
    name: N,
    value: FormWriteValueOf<TApi, TFields[N]>,
  ): void;

  /**
   * Creates or adopts rows on an object-item list. Specs with a `match`
   * adopt an existing matching row (meta applied, value preserved) exactly
   * once; unmatched specs append `"seeded"` rows.
   */
  ensureRows<N extends RowListKeys<TApi, TFields> & string>(
    name: N,
    specs: readonly RowSeedSpec<RowItemOf<TApi, TFields, N>>[],
  ): void;

  /** Removes rows by id, or every row of one provenance channel. */
  removeRows<N extends RowListKeys<TApi, TFields> & string>(
    name: N,
    selector: readonly string[] | { origin: RowOrigin },
  ): void;

  /** Replaces a field's option set (async option loading). */
  setOptions(
    name: keyof TFields & string,
    options: readonly SelectItem[],
  ): void;

  /**
   * Pins an externally-determined error to a field. It shows immediately
   * and clears when the field's value changes — or explicitly.
   */
  setServerError(name: keyof TFields & string, message: string): void;
  clearServerError(name: keyof TFields & string): void;

  /**
   * Engine-owned visibility. Hidden fields are excluded from validation
   * and serialized per the hidden-field policy.
   */
  setVisible(name: keyof TFields & string, visible: boolean): void;
  isVisible(name: keyof TFields & string): boolean;

  /**
   * Re-parses from the given API-model values (or the initial ones),
   * clearing dirty state and display state — the only operation that does.
   */
  reset(apiValues?: Partial<TApi>): void;
}
