import type { FieldMap } from "../types/fields";
import type { EngineMessages } from "../types/messages";
import type { ListRow } from "../types/rows";
import type { StandardSchemaV1 } from "../types/standardSchema";
import { builtinFieldTypeRuntimes, type FieldTypeRuntime } from "./fieldTypes";
import type { ResolvedSchema } from "./resolver";
import { isBlankItemDefault, isCompleteItemDefault } from "./rowModel";

/** Raw validity for one field. `cells` is rowId → column → message. */
export interface FieldValidationResult {
  errors: readonly string[];
  cells: ReadonlyMap<string, Readonly<Record<string, string>>>;
}

const NO_CELLS: ReadonlyMap<
  string,
  Readonly<Record<string, string>>
> = new Map();

/** The structural shape of a definition's validation, seen loosely. */
interface AnyValidation {
  required?: boolean | { message: string };
  custom?: (
    value: unknown,
    formValues: Readonly<Record<string, unknown>>,
  ) => string | null | undefined;
  schema?: StandardSchemaV1<unknown>;
  minLength?: { value: number; message?: string };
  maxLength?: { value: number; message?: string };
  pattern?: { value: RegExp; message?: string };
  min?: { value: number | string; message?: string };
  max?: { value: number | string; message?: string };
  minItems?: { value: number; message?: string };
  maxItems?: { value: number; message?: string };
}

/**
 * Evaluates raw validity for every non-hidden resolved field. Pure: no
 * display gating here — when errors are *shown* is the presentation
 * controller's concern.
 */
export function validateFields<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
>(options: {
  schema: ResolvedSchema<TApi, TContext, TFields>;
  formValues: Readonly<Record<string, unknown>>;
  hidden?: ReadonlySet<string>;
  fieldTypes?: Record<string, FieldTypeRuntime>;
  messages: EngineMessages;
}): Map<string, FieldValidationResult> {
  const results = new Map<string, FieldValidationResult>();
  for (const [name, definition] of options.schema.fields) {
    if (options.hidden?.has(name) === true) {
      continue;
    }
    const def = definition as { type: string; validation?: AnyValidation };
    const runtime =
      options.fieldTypes?.[def.type] ?? builtinFieldTypeRuntimes[def.type];
    results.set(
      name,
      validateField(
        def.validation ?? {},
        options.formValues[name],
        options.formValues,
        runtime ?? {},
        options.messages,
      ),
    );
  }
  return results;
}

/** True when no field has an error, field-level or per-cell. */
export function isValidResult(
  results: ReadonlyMap<string, FieldValidationResult>,
): boolean {
  for (const result of results.values()) {
    if (result.errors.length > 0 || result.cells.size > 0) {
      return false;
    }
  }
  return true;
}

function validateField(
  validation: AnyValidation,
  value: unknown,
  formValues: Readonly<Record<string, unknown>>,
  runtime: FieldTypeRuntime,
  messages: EngineMessages,
): FieldValidationResult {
  return runtime.list !== undefined
    ? validateListField(validation, value, formValues, runtime, messages)
    : validateScalarField(validation, value, formValues, messages);
}

function validateScalarField(
  validation: AnyValidation,
  value: unknown,
  formValues: Readonly<Record<string, unknown>>,
  messages: EngineMessages,
): FieldValidationResult {
  const errors: string[] = [];
  const m = messages.validation;

  if (isEmptyValue(value)) {
    // An empty value fails required and nothing else: range rules on an
    // absent value would only pile on noise.
    if (validation.required !== undefined && validation.required !== false) {
      errors.push(requiredMessage(validation.required, messages));
    }
  } else {
    if (typeof value === "string") {
      const { minLength, maxLength, pattern, min, max } = validation;
      if (minLength !== undefined && value.length < minLength.value) {
        errors.push(minLength.message ?? m.minLength(minLength.value));
      }
      if (maxLength !== undefined && value.length > maxLength.value) {
        errors.push(maxLength.message ?? m.maxLength(maxLength.value));
      }
      if (pattern !== undefined && !pattern.value.test(value)) {
        errors.push(pattern.message ?? m.pattern);
      }
      // date bounds: ISO strings compare lexicographically
      if (
        min !== undefined &&
        typeof min.value === "string" &&
        value < min.value
      ) {
        errors.push(min.message ?? m.dateMin(min.value));
      }
      if (
        max !== undefined &&
        typeof max.value === "string" &&
        value > max.value
      ) {
        errors.push(max.message ?? m.dateMax(max.value));
      }
    }
    if (typeof value === "number") {
      const { min, max } = validation;
      if (
        min !== undefined &&
        typeof min.value === "number" &&
        value < min.value
      ) {
        errors.push(min.message ?? m.min(min.value));
      }
      if (
        max !== undefined &&
        typeof max.value === "number" &&
        value > max.value
      ) {
        errors.push(max.message ?? m.max(max.value));
      }
    }
  }

  runCustom(validation, value, formValues, errors);
  runSchema(validation, value, errors);
  return { errors, cells: NO_CELLS };
}

function validateListField(
  validation: AnyValidation,
  value: unknown,
  formValues: Readonly<Record<string, unknown>>,
  runtime: FieldTypeRuntime,
  messages: EngineMessages,
): FieldValidationResult {
  const m = messages.validation;
  const rows = Array.isArray(value) ? (value as ListRow<unknown>[]) : [];
  const isBlank = runtime.list?.isBlankItem ?? isBlankItemDefault;
  const isComplete = runtime.list?.isCompleteItem ?? isCompleteItemDefault;

  const presentRows = rows.filter((row) => !isBlank(row.value));
  const items = presentRows.map((row) => row.value);
  const errors: string[] = [];

  if (
    validation.required !== undefined &&
    validation.required !== false &&
    items.length === 0
  ) {
    errors.push(requiredMessage(validation.required, messages));
  }
  if (
    validation.minItems !== undefined &&
    items.length < validation.minItems.value
  ) {
    errors.push(
      validation.minItems.message ?? m.minItems(validation.minItems.value),
    );
  }
  if (
    validation.maxItems !== undefined &&
    items.length > validation.maxItems.value
  ) {
    errors.push(
      validation.maxItems.message ?? m.maxItems(validation.maxItems.value),
    );
  }

  runCustom(validation, items, formValues, errors);
  runSchema(validation, items, errors);

  // A present-but-incomplete row errors on its empty string cells.
  const cells = new Map<string, Readonly<Record<string, string>>>();
  for (const row of presentRows) {
    if (isComplete(row.value)) {
      continue;
    }
    if (row.value === null || typeof row.value !== "object") {
      continue;
    }
    const rowErrors: Record<string, string> = {};
    for (const [column, cell] of Object.entries(row.value)) {
      if (typeof cell === "string" && cell.trim() === "") {
        rowErrors[column] = m.required;
      }
    }
    if (Object.keys(rowErrors).length > 0) {
      cells.set(row.id, rowErrors);
    }
  }

  return { errors, cells };
}

function runCustom(
  validation: AnyValidation,
  value: unknown,
  formValues: Readonly<Record<string, unknown>>,
  errors: string[],
): void {
  if (validation.custom === undefined) {
    return;
  }
  const message = validation.custom(value, formValues);
  if (typeof message === "string" && message.length > 0) {
    errors.push(message);
  }
}

function runSchema(
  validation: AnyValidation,
  value: unknown,
  errors: string[],
): void {
  if (validation.schema === undefined) {
    return;
  }
  const result = validation.schema["~standard"].validate(value);
  if (result instanceof Promise) {
    throw new Error(
      "validation.schema must validate synchronously. For async checks, " +
        "run them outside the form and pin the result with setServerError.",
    );
  }
  const issue = result.issues?.[0];
  if (issue !== undefined) {
    errors.push(issue.message);
  }
}

function requiredMessage(
  required: boolean | { message: string },
  messages: EngineMessages,
): string {
  return typeof required === "object"
    ? required.message
    : messages.validation.required;
}

/** Empty: "" (after trim), null/undefined, NaN, and false (checkboxes). */
function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === false) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  return typeof value === "number" && Number.isNaN(value);
}
