import type { FieldMap, HiddenFieldPolicy, Transform } from "../types/fields";
import type { KnownRowSpec, ListRow } from "../types/rows";
import { builtinFieldTypeRuntimes, type FieldTypeRuntime } from "./fieldTypes";
import type { ResolvedSchema } from "./resolver";
import {
  createRowsState,
  isBlankItemDefault,
  type RowsState,
  stampKnownRows,
} from "./rowModel";

/**
 * The result of parsing API values for a resolved schema. `formValues` is
 * keyed by field name (lists as rows); `rowStates` carries the row-model
 * bookkeeping per list field; `passthrough` is the API object with module
 * defaults filled — the base serialization writes back onto, so unknown
 * API keys survive a round trip untouched.
 */
export interface ParsedForm {
  formValues: Record<string, unknown>;
  rowStates: Map<string, RowsState<unknown>>;
  passthrough: Record<string, unknown>;
}

/**
 * The structural shape this module needs from a definition. Generic
 * `FieldDefinition<TApi>` is unusable here: for an unbound `TApi` it
 * collapses, so the resolver's definitions are cast to this at the loop
 * boundary.
 */
interface AnyFieldDefinition {
  key: string;
  type: string;
  defaultValue?: unknown;
  transform?: Transform<unknown, unknown>;
  whenHidden?: HiddenFieldPolicy;
  knownRows?: readonly KnownRowSpec<unknown>[];
}

/**
 * Parse: per field, the API value at its key → `transform.parse` →
 * `defaultValue` when absent → the type's empty value → row wrapping for
 * list types. Absence never reaches the form model.
 */
export function parseApiValues<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
>(options: {
  schema: ResolvedSchema<TApi, TContext, TFields>;
  apiValues?: Partial<TApi> | undefined;
  fieldTypes?: Record<string, FieldTypeRuntime>;
}): ParsedForm {
  const { schema } = options;
  const passthrough = cloneData(options.apiValues ?? {}) as Record<
    string,
    unknown
  >;
  for (const [path, value] of Object.entries(schema.defaults)) {
    if (getPath(passthrough, path) === undefined) {
      setPath(passthrough, path, value);
    }
  }

  const formValues: Record<string, unknown> = {};
  const rowStates = new Map<string, RowsState<unknown>>();

  for (const [name, resolved] of schema.fields) {
    const parsedField = parseFieldEntry(
      resolved as AnyFieldDefinition,
      passthrough,
      options.fieldTypes,
    );
    if (parsedField.rows !== undefined) {
      rowStates.set(name, parsedField.rows);
    }
    formValues[name] = parsedField.value;
  }

  return { formValues, rowStates, passthrough };
}

/**
 * Parses one field from the passthrough. Internal — the engine uses it to
 * parse fields that join the schema after a re-resolution.
 */
export function parseFieldEntry(
  definition: { key: string; type: string } & Partial<AnyFieldDefinition>,
  passthrough: Record<string, unknown>,
  fieldTypes: Record<string, FieldTypeRuntime> | undefined,
): { value: unknown; rows?: RowsState<unknown> } {
  const runtime = runtimeOf(definition, fieldTypes);
  const value = parseFieldValue(definition, passthrough, runtime);
  if (runtime.list !== undefined) {
    const items = Array.isArray(value) ? value : [];
    let state = createRowsState(items, "api");
    if (definition.knownRows !== undefined) {
      state = stampKnownRows(state, definition.knownRows);
    }
    return { value: state.rows, rows: state };
  }
  return { value };
}

function parseFieldValue(
  definition: { key: string } & Partial<AnyFieldDefinition>,
  passthrough: Record<string, unknown>,
  runtime: FieldTypeRuntime,
): unknown {
  const apiValue = getPath(passthrough, definition.key);
  if (apiValue !== undefined) {
    return definition.transform !== undefined
      ? definition.transform.parse(apiValue)
      : apiValue;
  }
  if (definition.defaultValue !== undefined) {
    return definition.defaultValue;
  }
  return runtime.emptyValue?.();
}

/**
 * Serialize: per field, unwrap rows → drop blank items →
 * `transform.serialize` → write at the definition's key onto the
 * passthrough base. Hidden fields follow their `whenHidden` policy (the
 * form-level `hiddenValues` default is `"omit"`); `NaN` numbers are
 * treated as absent and omitted.
 */
export function serializeFormValues<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
>(options: {
  schema: ResolvedSchema<TApi, TContext, TFields>;
  formValues: Record<string, unknown>;
  passthrough: Record<string, unknown>;
  fieldTypes?: Record<string, FieldTypeRuntime>;
  hidden?: ReadonlySet<string>;
  hiddenValues?: "omit" | "null";
}): Record<string, unknown> {
  const { schema } = options;
  const output = cloneData(options.passthrough);

  for (const [name, resolved] of schema.fields) {
    const definition = resolved as AnyFieldDefinition;
    if (options.hidden?.has(name) === true) {
      const policy = definition.whenHidden ?? options.hiddenValues ?? "omit";
      if (policy === "omit") {
        deletePath(output, definition.key);
        continue;
      }
      if (policy === "null") {
        setPath(output, definition.key, null);
        continue;
      }
      // "keep" falls through to normal serialization
    }

    const runtime = runtimeOf(definition, options.fieldTypes);
    const value = serializeFieldValue(
      definition,
      options.formValues[name],
      runtime,
    );
    if (typeof value === "number" && Number.isNaN(value)) {
      deletePath(output, definition.key);
      continue;
    }
    setPath(output, definition.key, value);
  }

  return output;
}

function serializeFieldValue(
  definition: AnyFieldDefinition,
  formValue: unknown,
  runtime: FieldTypeRuntime,
): unknown {
  let value = formValue;
  if (runtime.list !== undefined) {
    const rows = Array.isArray(value) ? (value as ListRow<unknown>[]) : [];
    const isBlank = runtime.list.isBlankItem ?? isBlankItemDefault;
    value = rows.map((row) => row.value).filter((item) => !isBlank(item));
  }
  return definition.transform !== undefined
    ? definition.transform.serialize(value)
    : value;
}

function runtimeOf(
  definition: AnyFieldDefinition,
  fieldTypes: Record<string, FieldTypeRuntime> | undefined,
): FieldTypeRuntime {
  const runtime =
    fieldTypes?.[definition.type] ?? builtinFieldTypeRuntimes[definition.type];
  if (runtime === undefined) {
    throw new Error(
      `No runtime registered for field type "${definition.type}".`,
    );
  }
  return runtime;
}

/** Deep clone for plain API data (objects and arrays; leaves copied by reference). */
function cloneData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(cloneData) as T;
  }
  if (value !== null && typeof value === "object") {
    const clone: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      clone[key] = cloneData(entry);
    }
    return clone as T;
  }
  return value;
}

function getPath(target: Record<string, unknown>, path: string): unknown {
  let current: unknown = target;
  for (const segment of path.split(".")) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function setPath(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const segments = path.split(".");
  let current = target;
  for (const segment of segments.slice(0, -1)) {
    const next = current[segment];
    if (next === null || typeof next !== "object") {
      const created: Record<string, unknown> = {};
      current[segment] = created;
      current = created;
    } else {
      current = next as Record<string, unknown>;
    }
  }
  current[segments[segments.length - 1] as string] = value;
}

function deletePath(target: Record<string, unknown>, path: string): void {
  const segments = path.split(".");
  let current: Record<string, unknown> = target;
  for (const segment of segments.slice(0, -1)) {
    const next = current[segment];
    if (next === null || typeof next !== "object") {
      return;
    }
    current = next as Record<string, unknown>;
  }
  delete current[segments[segments.length - 1] as string];
}
