import type { FieldMap } from "./fields";
import type { FormValueOf } from "./values";

/**
 * Where a row came from — stamped by its entry channel, never mutated:
 * `"api"` rows were created at parse from incoming data, `"seeded"` rows by
 * `ensureRows` (rules or engine API), `"user"` rows by the list UI's add.
 * Provenance scopes removal (seeded cleanup never deletes user rows) and
 * lets validation and rendering treat machine rows differently.
 */
export type RowOrigin = "api" | "seeded" | "user";

/**
 * Flags the engine understands, plus arbitrary consumer data. `pinned`
 * disables the removal affordance — and only that; locking cells is a
 * separate concern (`keyReadOnly` for a keyValueList's key column), kept
 * apart deliberately so seeded-but-editable rows are expressible.
 */
export interface RowMeta {
  pinned?: boolean;
  keyReadOnly?: boolean;
  [custom: string]: unknown;
}

/**
 * One row of a list field's form value. Value and metadata live in a single
 * immutable object so they cannot desync; updates replace the row (the
 * engine relies on reference equality for no-op detection). `id` is
 * engine-generated and stable for the row's lifetime — it is the React key
 * and the address for per-cell errors.
 */
export interface ListRow<TItem> {
  readonly id: string;
  readonly value: TItem;
  readonly origin: RowOrigin;
  readonly meta: Readonly<RowMeta>;
}

/**
 * A seeding instruction for `ensureRows`. When `match` is given and an
 * existing row's value matches it, that row is adopted (meta applied, value
 * preserved) exactly once — a lease, not a subscription; otherwise a new
 * `"seeded"` row is created with `value`.
 */
export interface RowSeedSpec<TItem> {
  match?: Partial<TItem>;
  value: TItem;
  meta?: RowMeta;
}

/**
 * The field names whose form value is a row list with object items — the
 * keys `ensureRows`/`removeRows` accept. String lists have row identity
 * too, but no columns to seed or lock, so they are excluded from seeding.
 */
export type RowListKeys<TApi, TFields extends FieldMap<TApi>> = {
  [N in keyof TFields]: FormValueOf<TApi, TFields[N]> extends ListRow<
    infer TItem
  >[]
    ? TItem extends object
      ? N
      : never
    : never;
}[keyof TFields];
