import { type AnyFormApi, FormApi } from "@tanstack/react-form";
import type { FormEngineApi } from "../types/engine";
import type { FieldMap } from "../types/fields";
import type { SelectItem } from "../types/registry";
import type { RowOrigin, RowSeedSpec } from "../types/rows";
import type { FieldTypeRuntime } from "./fieldTypes";
import type { ResolvedSchema } from "./resolver";
import {
  addUserRow,
  createRowsState,
  ensureRows as ensureRowsOp,
  type RowsState,
  removeRowsById,
  removeRowsByOrigin,
  updateRowValue,
} from "./rowModel";
import { parseApiValues, serializeFormValues } from "./transforms";

/**
 * Writes come in two channels. User-channel writes dirty the form and stamp
 * `"user"` provenance; derived-channel writes (rules, seeding) use
 * TanStack's `dontUpdateMeta` so they never dirty, and stamp `"seeded"`.
 */
type Channel = "user" | "derived";

export interface EngineOptions<TApi, TContext, TFields extends FieldMap<TApi>> {
  schema: ResolvedSchema<TApi, TContext, TFields>;
  apiValues?: Partial<TApi>;
  fieldTypes?: Record<string, FieldTypeRuntime>;
  hiddenValues?: "omit" | "null";
}

export interface VisibilityStore {
  isVisible(name: string): boolean;
  /** The current hidden set — a stable reference until the next change. */
  hiddenNames(): ReadonlySet<string>;
  subscribe(listener: () => void): () => void;
}

export interface OptionsStore {
  get(name: string): readonly SelectItem[] | undefined;
  subscribe(listener: () => void): () => void;
}

export interface ServerErrorsStore {
  get(name: string): string | undefined;
  entries(): ReadonlyMap<string, string>;
  subscribe(listener: () => void): () => void;
}

/**
 * Everything the engine owns, for the layers above it. `engine` is the
 * public rung-2 surface (user channel); `ruleScope` is the same surface on
 * the derived channel — hand it to rules, never to page code.
 */
export interface FormEngineInternals<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
> {
  form: AnyFormApi;
  engine: FormEngineApi<TApi, TFields>;
  ruleScope: FormEngineApi<TApi, TFields>;
  schema: ResolvedSchema<TApi, TContext, TFields>;
  fieldTypes: Record<string, FieldTypeRuntime> | undefined;
  visibility: VisibilityStore;
  options: OptionsStore;
  serverErrors: ServerErrorsStore;
  lists: {
    add(name: keyof TFields & string, item: unknown): void;
    update(name: keyof TFields & string, id: string, item: unknown): void;
  };
  isDirty(): boolean;
  serialize(): Record<string, unknown>;
  /** Activates the underlying form; returns its cleanup. */
  mount(): () => void;
}

function createNotifier() {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify(): void {
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

export function createEngine<TApi, TContext, TFields extends FieldMap<TApi>>(
  options: EngineOptions<TApi, TContext, TFields>,
): FormEngineInternals<TApi, TContext, TFields> {
  const { schema, fieldTypes } = options;

  let parsed = parseApiValues({
    schema,
    apiValues: options.apiValues,
    fieldTypes,
  });
  let rowStates = parsed.rowStates;
  let baselineApiValues = options.apiValues;

  // Widened immediately: a concrete FormApi<TFormData, ...> is not
  // assignable to TanStack's AnyFormApi (its listener parameters are
  // contravariant in the form type), and the engine only needs the
  // untyped surface — our own types cover the outside.
  const form = new FormApi({
    defaultValues: parsed.formValues,
  }) as unknown as AnyFormApi;

  let hidden: ReadonlySet<string> = new Set<string>();
  const optionsMap = new Map<string, readonly SelectItem[]>();
  const errorsMap = new Map<string, string>();
  const visibilityNotifier = createNotifier();
  const optionsNotifier = createNotifier();
  const errorsNotifier = createNotifier();

  function assertField(name: string): void {
    if (!schema.fields.has(name as keyof TFields & string)) {
      throw new Error(`Unknown field "${name}".`);
    }
  }

  function isListField(name: string): boolean {
    return rowStates.has(name);
  }

  function write(name: string, value: unknown, channel: Channel): void {
    form.setFieldValue(name as never, value as never, {
      dontUpdateMeta: channel === "derived",
    });
  }

  function writeRows(
    name: string,
    state: RowsState<unknown>,
    channel: Channel,
  ): void {
    rowStates = new Map(rowStates);
    rowStates.set(name, state);
    write(name, state.rows, channel);
  }

  function makeApi(channel: Channel): FormEngineApi<TApi, TFields> {
    const rowOrigin: RowOrigin = channel === "user" ? "user" : "seeded";

    const api = {
      getValue(name: string): unknown {
        assertField(name);
        return form.getFieldValue(name as never);
      },

      setValue(name: string, value: unknown): void {
        assertField(name);
        if (isListField(name)) {
          const items = Array.isArray(value) ? value : [];
          writeRows(name, createRowsState(items, rowOrigin), channel);
        } else {
          write(name, value, channel);
        }
      },

      ensureRows(name: string, specs: readonly RowSeedSpec<unknown>[]): void {
        assertField(name);
        const current = rowStates.get(name);
        if (current === undefined) {
          throw new Error(`Field "${name}" is not a list field.`);
        }
        const next = ensureRowsOp(current, specs);
        if (next !== current) {
          writeRows(name, next, channel);
        }
      },

      removeRows(
        name: string,
        selector: readonly string[] | { origin: RowOrigin },
      ): void {
        assertField(name);
        const current = rowStates.get(name);
        if (current === undefined) {
          throw new Error(`Field "${name}" is not a list field.`);
        }
        const next = Array.isArray(selector)
          ? removeRowsById(current, selector)
          : removeRowsByOrigin(
              current,
              (selector as { origin: RowOrigin }).origin,
            );
        if (next !== current) {
          writeRows(name, next, channel);
        }
      },

      setOptions(name: string, items: readonly SelectItem[]): void {
        assertField(name);
        optionsMap.set(name, items);
        optionsNotifier.notify();
      },

      setServerError(name: string, message: string): void {
        assertField(name);
        errorsMap.set(name, message);
        errorsNotifier.notify();
      },

      clearServerError(name: string): void {
        assertField(name);
        if (errorsMap.delete(name)) {
          errorsNotifier.notify();
        }
      },

      setVisible(name: string, visible: boolean): void {
        assertField(name);
        const currentlyVisible = !hidden.has(name);
        if (visible === currentlyVisible) {
          return;
        }
        const next = new Set(hidden);
        if (visible) {
          next.delete(name);
        } else {
          next.add(name);
        }
        hidden = next;
        visibilityNotifier.notify();
      },

      isVisible(name: string): boolean {
        assertField(name);
        return !hidden.has(name);
      },

      reset(apiValues?: Partial<TApi>): void {
        if (apiValues !== undefined) {
          baselineApiValues = apiValues;
        }
        parsed = parseApiValues({
          schema,
          apiValues: baselineApiValues,
          fieldTypes,
        });
        rowStates = parsed.rowStates;
        form.options = {
          ...form.options,
          defaultValues: parsed.formValues as never,
        };
        form.reset();
        hidden = new Set();
        errorsMap.clear();
        visibilityNotifier.notify();
        errorsNotifier.notify();
      },
    };

    // Implemented against loose runtime types; the generic surface is the
    // type-level contract pinned by the engine type tests.
    return api as unknown as FormEngineApi<TApi, TFields>;
  }

  const engine = makeApi("user");
  const ruleScope = makeApi("derived");

  return {
    form,
    engine,
    ruleScope,
    schema,
    fieldTypes,
    visibility: {
      isVisible: (name) => !hidden.has(name),
      hiddenNames: () => hidden,
      subscribe: visibilityNotifier.subscribe,
    },
    options: {
      get: (name) => optionsMap.get(name),
      subscribe: optionsNotifier.subscribe,
    },
    serverErrors: {
      get: (name) => errorsMap.get(name),
      entries: () => errorsMap,
      subscribe: errorsNotifier.subscribe,
    },
    lists: {
      add(name, item) {
        const current = rowStates.get(name);
        if (current === undefined) {
          throw new Error(`Field "${name}" is not a list field.`);
        }
        writeRows(name, addUserRow(current, item), "user");
      },
      update(name, id, item) {
        const current = rowStates.get(name);
        if (current === undefined) {
          throw new Error(`Field "${name}" is not a list field.`);
        }
        const next = updateRowValue(current, id, item);
        if (next !== current) {
          writeRows(name, next, "user");
        }
      },
    },
    isDirty: () => form.state.isDirty,
    serialize: () =>
      serializeFormValues({
        schema,
        formValues: form.state.values as Record<string, unknown>,
        passthrough: parsed.passthrough,
        fieldTypes,
        hidden,
        hiddenValues: options.hiddenValues,
      }),
    mount: () => form.mount(),
  };
}
