import type {
  KnownRowSpec,
  ListRow,
  RowMeta,
  RowOrigin,
  RowSeedSpec,
} from "../types/rows";

/**
 * One list field's rows plus the engine's seeding bookkeeping. All
 * operations are pure: they return a new state, or the *same* state object
 * when nothing changed — rule-runner loop safety relies on that.
 *
 * `seeds` binds a seed spec's signature to the row currently holding its
 * lease; `stamped` records which meta keys the seeding applied to each
 * bound row, so releasing the lease can strip exactly those.
 */
export interface RowsState<TItem> {
  readonly rows: readonly ListRow<TItem>[];
  readonly seeds: ReadonlyMap<string, string>;
  readonly stamped: ReadonlyMap<string, readonly string[]>;
}

let nextRowId = 0;

function createRow<TItem>(
  value: TItem,
  origin: RowOrigin,
  meta: RowMeta = {},
): ListRow<TItem> {
  nextRowId += 1;
  return { id: `row-${nextRowId}`, value, origin, meta };
}

export function createRowsState<TItem>(
  items: readonly TItem[],
  origin: RowOrigin,
): RowsState<TItem> {
  return {
    rows: items.map((item) => createRow(item, origin)),
    seeds: new Map(),
    stamped: new Map(),
  };
}

export function addUserRow<TItem>(
  state: RowsState<TItem>,
  item: TItem,
): RowsState<TItem> {
  return { ...state, rows: [...state.rows, createRow(item, "user")] };
}

/** Replaces one row's value; id, origin, and meta are preserved. */
export function updateRowValue<TItem>(
  state: RowsState<TItem>,
  id: string,
  value: TItem,
): RowsState<TItem> {
  const target = state.rows.find((row) => row.id === id);
  if (target === undefined || Object.is(target.value, value)) {
    return state;
  }
  return {
    ...state,
    rows: state.rows.map((row) => (row === target ? { ...row, value } : row)),
  };
}

/**
 * Guarantees one row per spec — a lease. A spec whose lease is intact is a
 * no-op even if the bound row's value has since been edited past matching
 * (adoption is checked once, not subscribed to). Otherwise an existing
 * matching row is adopted: the spec's meta is stamped onto it, value and
 * origin untouched. With no match, a `"seeded"` row is created.
 */
export function ensureRows<TItem>(
  state: RowsState<TItem>,
  specs: readonly RowSeedSpec<TItem>[],
): RowsState<TItem> {
  let rows = state.rows;
  const seeds = new Map(state.seeds);
  const stamped = new Map(state.stamped);
  let changed = false;

  for (const spec of specs) {
    const signature = signatureOf(spec);
    const boundId = seeds.get(signature);
    if (boundId !== undefined && rows.some((row) => row.id === boundId)) {
      continue;
    }

    const alreadyBound = new Set(seeds.values());
    const adoptable = rows.find(
      (row) => !alreadyBound.has(row.id) && matchesSpec(row.value, spec),
    );

    if (adoptable !== undefined) {
      rows = rows.map((row) =>
        row === adoptable
          ? { ...row, meta: { ...row.meta, ...spec.meta } }
          : row,
      );
      seeds.set(signature, adoptable.id);
      stamped.set(adoptable.id, Object.keys(spec.meta ?? {}));
    } else {
      const row = createRow(spec.value, "seeded", { ...spec.meta });
      rows = [...rows, row];
      seeds.set(signature, row.id);
      stamped.set(row.id, Object.keys(spec.meta ?? {}));
    }
    changed = true;
  }

  return changed ? { rows, seeds, stamped } : state;
}

/**
 * Parse-time stamping: merges each spec's meta onto the first unclaimed
 * matching row. Adopt-only (nothing is created) and permanent — no seeding
 * bookkeeping is recorded, so releasing seeded rows never strips these.
 */
export function stampKnownRows<TItem>(
  state: RowsState<TItem>,
  specs: readonly KnownRowSpec<TItem>[],
): RowsState<TItem> {
  let rows = state.rows;
  const claimed = new Set<string>();
  let changed = false;

  for (const spec of specs) {
    const target = rows.find(
      (row) => !claimed.has(row.id) && matchesPartial(row.value, spec.match),
    );
    if (target === undefined) {
      continue;
    }
    claimed.add(target.id);
    if (Object.keys(spec.meta).length > 0) {
      rows = rows.map((row) =>
        row === target ? { ...row, meta: { ...row.meta, ...spec.meta } } : row,
      );
      changed = true;
    }
  }

  return changed ? { ...state, rows } : state;
}

export function removeRowsById<TItem>(
  state: RowsState<TItem>,
  ids: readonly string[],
): RowsState<TItem> {
  const remove = new Set(ids);
  if (!state.rows.some((row) => remove.has(row.id))) {
    return state;
  }
  return withoutRows(state, (row) => remove.has(row.id));
}

/**
 * Removes every row of one provenance channel. For `"seeded"` this is the
 * lease release: created-seeded rows are deleted, adopted rows stay but
 * lose exactly the meta keys stamped at adoption — user edits survive.
 */
export function removeRowsByOrigin<TItem>(
  state: RowsState<TItem>,
  origin: RowOrigin,
): RowsState<TItem> {
  if (origin === "seeded") {
    return releaseSeeded(state);
  }
  if (!state.rows.some((row) => row.origin === origin)) {
    return state;
  }
  return withoutRows(state, (row) => row.origin === origin);
}

function releaseSeeded<TItem>(state: RowsState<TItem>): RowsState<TItem> {
  if (state.seeds.size === 0 && state.stamped.size === 0) {
    return state;
  }

  const rows: ListRow<TItem>[] = [];
  for (const row of state.rows) {
    if (row.origin === "seeded") {
      continue;
    }
    const stampedKeys = state.stamped.get(row.id);
    if (stampedKeys === undefined || stampedKeys.length === 0) {
      rows.push(row);
      continue;
    }
    const meta: RowMeta = { ...row.meta };
    for (const key of stampedKeys) {
      delete meta[key];
    }
    rows.push({ ...row, meta });
  }

  return { rows, seeds: new Map(), stamped: new Map() };
}

/** Removal plus bookkeeping cleanup for the removed ids. */
function withoutRows<TItem>(
  state: RowsState<TItem>,
  shouldRemove: (row: ListRow<TItem>) => boolean,
): RowsState<TItem> {
  const removedIds = new Set(
    state.rows.filter(shouldRemove).map((row) => row.id),
  );
  const seeds = new Map(
    [...state.seeds].filter(([, rowId]) => !removedIds.has(rowId)),
  );
  const stamped = new Map(
    [...state.stamped].filter(([rowId]) => !removedIds.has(rowId)),
  );
  return {
    rows: state.rows.filter((row) => !removedIds.has(row.id)),
    seeds,
    stamped,
  };
}

/** A spec's identity: its match when given, its value otherwise. */
function signatureOf(spec: RowSeedSpec<unknown>): string {
  return stableStringify(spec.match ?? spec.value);
}

function matchesSpec<TItem>(value: TItem, spec: RowSeedSpec<TItem>): boolean {
  if (spec.match !== undefined) {
    return matchesPartial(value, spec.match);
  }
  return shallowEquals(value, spec.value);
}

function matchesPartial<TItem>(value: TItem, match: Partial<TItem>): boolean {
  return Object.entries(match).every(([key, expected]) =>
    Object.is((value as Record<string, unknown>)[key], expected),
  );
}

function shallowEquals(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  return (
    keysA.length === keysB.length &&
    keysA.every((key) =>
      Object.is(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    )
  );
}

/** JSON with sorted object keys, so equal specs sign equally. */
function stableStringify(value: unknown): string {
  if (typeof value !== "object" || value === null) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.entries(value)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, v]) => `${JSON.stringify(key)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}

/**
 * Default blankness: a string item is blank when empty after trimming; an
 * object item when every string cell is. Field types with non-string cells
 * override these on their runtime spec.
 */
export function isBlankItemDefault(item: unknown): boolean {
  if (typeof item === "string") {
    return item.trim() === "";
  }
  if (item !== null && typeof item === "object") {
    return stringCells(item).every((cell) => cell.trim() === "");
  }
  return item === null || item === undefined;
}

/** Default completeness: every string cell filled. */
export function isCompleteItemDefault(item: unknown): boolean {
  if (typeof item === "string") {
    return item.trim() !== "";
  }
  if (item !== null && typeof item === "object") {
    return stringCells(item).every((cell) => cell.trim() !== "");
  }
  return item !== null && item !== undefined;
}

function stringCells(item: object): string[] {
  return Object.values(item).filter(
    (cell): cell is string => typeof cell === "string",
  );
}
