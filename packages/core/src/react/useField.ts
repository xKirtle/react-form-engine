import { useCallback, useMemo, useSyncExternalStore } from "react";
import type {
  FieldRenderProps,
  RenderedFieldDefinition,
} from "../types/renderers";
import type { AnyFormBundle } from "./FormContext";

function adaptSubscribe(store: {
  subscribe: (listener: () => void) => unknown;
}): (listener: () => void) => () => void {
  return (listener) => {
    const subscription = store.subscribe(listener);
    return typeof subscription === "function"
      ? (subscription as () => void)
      : () => (subscription as { unsubscribe: () => void }).unsubscribe();
  };
}

/**
 * Assembles the computed props one field's renderer receives. Subscribes
 * to exactly what the field depends on: its store value, its gated
 * presentation, its options, and the schema version (definitions can
 * change on re-resolution).
 */
export function useFieldProps(
  bundle: AnyFormBundle,
  name: string,
): FieldRenderProps {
  const { internals, validation } = bundle;

  useSyncExternalStore(
    useMemo(() => internals.schemaVersion.subscribe, [internals]),
    internals.schemaVersion.current,
  );

  const definition = internals.schema.fields.get(name) as
    | RenderedFieldDefinition
    | undefined;
  if (definition === undefined) {
    throw new Error(`"${name}" is not a field of this form.`);
  }

  const value = useSyncExternalStore(
    useMemo(() => adaptSubscribe(internals.form.store), [internals]),
    () => internals.form.getFieldValue(name as never) as unknown,
  );
  const presentation = useSyncExternalStore(
    useMemo(() => validation.subscribe, [validation]),
    () => validation.presentationFor(name),
  );
  const engineOptions = useSyncExternalStore(
    useMemo(() => bundle.options.subscribe, [bundle.options]),
    () => bundle.options.get(name),
  );

  const setValue = useCallback(
    (next: unknown) => bundle.engine.setValue(name as never, next as never),
    [bundle.engine, name],
  );
  const markTouched = useCallback(
    () => validation.markTouched(name),
    [validation, name],
  );

  const configItems = (
    definition.config as { items?: FieldRenderProps["options"] } | undefined
  )?.items;
  const validationSlot = definition.validation as
    | { required?: unknown }
    | undefined;

  return useMemo(
    () => ({
      name,
      definition,
      value,
      setValue,
      markTouched,
      presentation,
      required:
        validationSlot?.required !== undefined &&
        validationSlot.required !== false,
      options: engineOptions ?? configItems,
      messages: bundle.messages,
    }),
    [
      name,
      definition,
      value,
      setValue,
      markTouched,
      presentation,
      validationSlot,
      engineOptions,
      configItems,
      bundle.messages,
    ],
  );
}
