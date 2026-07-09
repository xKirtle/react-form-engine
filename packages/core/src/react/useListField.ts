import { useMemo, useSyncExternalStore } from "react";
import {
  builtinFieldTypeRuntimes,
  type FieldTypeRuntime,
} from "../runtime/fieldTypes";
import { isCompleteItemDefault } from "../runtime/rowModel";
import type { FieldPresentation } from "../types/presentation";
import type { ListRow, RowMeta, RowOrigin } from "../types/rows";
import { useFormContext } from "./FormContext";

/** @group Hooks */
export interface ListFieldItem<TItem> {
  id: string;
  value: TItem;
  origin: RowOrigin;
  meta: Readonly<RowMeta>;
  /** Gated errors for this row's cells: column → message. */
  errors: Readonly<Record<string, string>>;
  /** User-channel edit; row identity, origin, and meta are preserved. */
  update(value: TItem): void;
  remove(): void;
  markCellTouched(column: string): void;
}

/** @group Hooks */
export interface ListFieldState<TItem> {
  items: readonly ListFieldItem<TItem>[];
  /** Appends a user row. */
  add(item: TItem): void;
  /** False while any row is incomplete — prevents stacking blanks. */
  canAdd: boolean;
  presentation: FieldPresentation;
}

/**
 * Row-model list state for list renderers and custom list UIs. Works for
 * any list field; for string lists, `useListField<string>(name)`.
 * Must render inside `<Form>`.
 *
 * @group Hooks
 */
export function useListField<TItem = unknown>(
  name: string,
): ListFieldState<TItem> {
  const { bundle } = useFormContext();
  const { internals, validation } = bundle;

  const rows = useSyncExternalStore(
    useMemo(() => {
      const store = internals.form.store;
      return (listener: () => void) => {
        const subscription = store.subscribe(listener);
        return typeof subscription === "function"
          ? (subscription as () => void)
          : () => (subscription as { unsubscribe: () => void }).unsubscribe();
      };
    }, [internals]),
    () => internals.form.getFieldValue(name as never) as unknown,
  );
  const presentation = useSyncExternalStore(
    useMemo(() => validation.subscribe, [validation]),
    () => validation.presentationFor(name),
  );

  if (!Array.isArray(rows)) {
    throw new Error(`"${name}" is not a list field of this form.`);
  }
  const listRows = rows as ListRow<TItem>[];

  const definition = internals.schema.fields.get(name as never) as
    | { type: string }
    | undefined;
  const runtime: FieldTypeRuntime =
    (definition !== undefined &&
      (internals.fieldTypes?.[definition.type] ??
        builtinFieldTypeRuntimes[definition.type])) ||
    {};
  const isComplete = runtime.list?.isCompleteItem ?? isCompleteItemDefault;

  const items = useMemo(
    () =>
      listRows.map(
        (row): ListFieldItem<TItem> => ({
          id: row.id,
          value: row.value,
          origin: row.origin,
          meta: row.meta,
          errors: presentation.cellErrors.get(row.id) ?? {},
          update: (value) =>
            internals.lists.update(name as never, row.id, value),
          remove: () => bundle.engine.removeRows(name as never, [row.id]),
          markCellTouched: (column) =>
            validation.markCellTouched(name, row.id, column),
        }),
      ),
    [listRows, presentation, internals, bundle.engine, validation, name],
  );

  return {
    items,
    add: (item) => internals.lists.add(name as never, item),
    canAdd: listRows.every((row) => isComplete(row.value)),
    presentation,
  };
}
