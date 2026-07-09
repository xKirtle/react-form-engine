import type { FieldMap } from "../types/fields";
import type { EngineMessages } from "../types/messages";
import type { FieldPresentation } from "../types/presentation";
import type { FormEngineInternals } from "./engine";
import type { ResolvedSchema } from "./resolver";
import {
  type FieldValidationResult,
  isValidResult,
  validateFields,
} from "./validate";

/** @group Validation */
export interface ValidationController<
  TApi = unknown,
  TContext = unknown,
  TFields extends FieldMap<TApi> = FieldMap<TApi>,
> {
  /**
   * Computes raw validity, snapshots init-origin errors, and subscribes to
   * the form, visibility, and server-error stores. Call *after* the rule
   * runner's initial pass, so rule-seeded values count as initial. Returns
   * stop.
   */
  start(): () => void;
  /** The gated presentation for one field; reference-stable per state. */
  presentationFor(name: string): FieldPresentation;
  subscribe(listener: () => void): () => void;
  /** Raw validity, ignoring display gating. */
  isValid(): boolean;
  /** Whether this field's display gate has been opened by touch. */
  isTouched(name: string): boolean;
  /** Whether a submit attempt has opened every gate. */
  isSubmitted(): boolean;
  markTouched(name: string): void;
  markCellTouched(name: string, rowId: string, column: string): void;
  markSubmitted(): void;
  /** Clears touched/submitted state and re-snapshots init-origin errors. */
  reset(): void;
  /**
   * Swaps the resolved schema after a re-resolution (context change).
   * Display state survives: touched/submitted/server errors persist for
   * surviving fields, state for removed fields is pruned, and fields new
   * to the schema snapshot their current errors as init-origin.
   */
  updateSchema(schema: ResolvedSchema<TApi, TContext, TFields>): void;
}

interface InitSnapshot {
  messages: ReadonlySet<string>;
  /** `${rowId}-${column}` keys that had errors at init. */
  cells: ReadonlySet<string>;
}

const EMPTY_PRESENTATION: FieldPresentation = {
  error: undefined,
  cellErrors: new Map(),
  invalid: false,
};

export function createValidationController<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
>(options: {
  internals: FormEngineInternals<TApi, TContext, TFields>;
  initialErrors?: "eager" | "gated";
  messages: EngineMessages;
}): ValidationController<TApi, TContext, TFields> {
  const { internals, messages } = options;
  const eager = options.initialErrors !== "gated";

  let schema = internals.schema;
  let results = new Map<string, FieldValidationResult>();
  const initSnapshots = new Map<string, InitSnapshot>();
  const touched = new Set<string>();
  const cellTouched = new Map<string, Set<string>>();
  let submitted = false;
  /** field value at the moment its server error was pinned */
  const serverErrorValues = new Map<string, unknown>();

  const listeners = new Set<() => void>();
  const cache = new Map<string, FieldPresentation>();

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function revalidate(): void {
    results = validateFields({
      schema,
      formValues: internals.form.state.values as Record<string, unknown>,
      hidden: internals.visibility.hiddenNames(),
      fieldTypes: internals.fieldTypes,
      messages,
    });
  }

  function snapshotInit(names: Iterable<string>): void {
    for (const name of names) {
      const result = results.get(name);
      const cellKeys = new Set<string>();
      for (const [rowId, columns] of result?.cells ?? []) {
        for (const column of Object.keys(columns)) {
          cellKeys.add(cellKey(rowId, column));
        }
      }
      initSnapshots.set(name, {
        messages: new Set(result?.errors ?? []),
        cells: cellKeys,
      });
    }
  }

  /** Server errors auto-clear when their field's value moves. */
  function clearStaleServerErrors(): void {
    for (const [name, valueAtSet] of serverErrorValues) {
      if (internals.serverErrors.get(name) === undefined) {
        serverErrorValues.delete(name);
        continue;
      }
      const current = internals.form.getFieldValue(name as never);
      if (!Object.is(current, valueAtSet)) {
        serverErrorValues.delete(name);
        internals.engine.clearServerError(name as never);
      }
    }
  }

  function computePresentation(name: string): FieldPresentation {
    const result = results.get(name);
    const serverError = internals.serverErrors.get(name);
    if (result === undefined) {
      // hidden or unknown: only a server error could show
      return serverError === undefined
        ? EMPTY_PRESENTATION
        : { error: serverError, cellErrors: new Map(), invalid: true };
    }

    const snapshot = initSnapshots.get(name);
    const revealed = submitted || touched.has(name);
    const gatedError = result.errors.find(
      (message) =>
        revealed || (eager && snapshot?.messages.has(message) === true),
    );

    const touchedCells = cellTouched.get(name);
    const cellErrors = new Map<string, Readonly<Record<string, string>>>();
    for (const [rowId, columns] of result.cells) {
      const shown: Record<string, string> = {};
      for (const [column, message] of Object.entries(columns)) {
        const key = cellKey(rowId, column);
        if (
          submitted ||
          touchedCells?.has(key) === true ||
          (eager && snapshot?.cells.has(key) === true)
        ) {
          shown[column] = message;
        }
      }
      if (Object.keys(shown).length > 0) {
        cellErrors.set(rowId, shown);
      }
    }

    return {
      error: serverError ?? gatedError,
      cellErrors,
      invalid:
        serverError !== undefined ||
        result.errors.length > 0 ||
        result.cells.size > 0,
    };
  }

  function refresh(revalidateFirst: boolean): void {
    if (revalidateFirst) {
      clearStaleServerErrors();
      revalidate();
    }
    notify();
  }

  return {
    start() {
      revalidate();
      // Snapshot before anything can subscribe-and-cache: a listener must
      // never observe a presentation computed against empty snapshots.
      snapshotInit(results.keys());
      for (const name of internals.serverErrors.entries().keys()) {
        serverErrorValues.set(
          name,
          internals.form.getFieldValue(name as never),
        );
      }

      const unsubscribers = [
        subscribeStore(internals.form.store, () => refresh(true)),
        internals.visibility.subscribe(() => refresh(true)),
        internals.serverErrors.subscribe(() => {
          for (const [name] of internals.serverErrors.entries()) {
            if (!serverErrorValues.has(name)) {
              serverErrorValues.set(
                name,
                internals.form.getFieldValue(name as never),
              );
            }
          }
          refresh(false);
        }),
      ];
      return () => {
        for (const unsubscribe of unsubscribers) {
          unsubscribe();
        }
      };
    },

    presentationFor(name) {
      const fresh = computePresentation(name);
      const cached = cache.get(name);
      if (cached !== undefined && samePresentation(cached, fresh)) {
        return cached;
      }
      cache.set(name, fresh);
      return fresh;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    isValid() {
      return isValidResult(results);
    },

    isTouched(name) {
      return touched.has(name);
    },

    isSubmitted() {
      return submitted;
    },

    markTouched(name) {
      if (!touched.has(name)) {
        touched.add(name);
        refresh(false);
      }
    },

    markCellTouched(name, rowId, column) {
      let cells = cellTouched.get(name);
      if (cells === undefined) {
        cells = new Set();
        cellTouched.set(name, cells);
      }
      const key = cellKey(rowId, column);
      if (!cells.has(key)) {
        cells.add(key);
        refresh(false);
      }
    },

    markSubmitted() {
      if (!submitted) {
        submitted = true;
        refresh(false);
      }
    },

    reset() {
      touched.clear();
      cellTouched.clear();
      submitted = false;
      serverErrorValues.clear();
      revalidate();
      initSnapshots.clear();
      snapshotInit(results.keys());
      notify();
    },

    updateSchema(nextSchema) {
      schema = nextSchema;
      const surviving = new Set<string>(
        nextSchema.fields.keys() as Iterable<string>,
      );
      for (const name of [...initSnapshots.keys()]) {
        if (!surviving.has(name)) {
          initSnapshots.delete(name);
          touched.delete(name);
          cellTouched.delete(name);
          cache.delete(name);
        }
      }
      revalidate();
      // fields new to the schema treat their current errors as init-origin
      const newcomers = [...results.keys()].filter(
        (name) => !initSnapshots.has(name),
      );
      snapshotInit(newcomers);
      notify();
    },
  };
}

function cellKey(rowId: string, column: string): string {
  return `${rowId} ${column}`;
}

function samePresentation(a: FieldPresentation, b: FieldPresentation): boolean {
  if (a.error !== b.error || a.invalid !== b.invalid) {
    return false;
  }
  if (a.cellErrors.size !== b.cellErrors.size) {
    return false;
  }
  for (const [rowId, columns] of a.cellErrors) {
    const other = b.cellErrors.get(rowId);
    if (other === undefined) {
      return false;
    }
    const keys = Object.keys(columns);
    if (keys.length !== Object.keys(other).length) {
      return false;
    }
    if (keys.some((key) => columns[key] !== other[key])) {
      return false;
    }
  }
  return true;
}

function subscribeStore(
  store: { subscribe: (listener: () => void) => unknown },
  listener: () => void,
): () => void {
  const subscription = store.subscribe(listener);
  if (typeof subscription === "function") {
    return subscription as () => void;
  }
  return () => {
    (subscription as { unsubscribe: () => void }).unsubscribe();
  };
}
