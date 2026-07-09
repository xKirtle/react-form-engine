import { useMemo, useSyncExternalStore } from "react";
import type { FieldMap } from "../types/fields";
import type { FormValueOf } from "../types/values";
import type { UseFormEngineReturn } from "./useFormEngine";

/**
 * The reactive, typed form value of one field. Re-renders the caller only
 * when this field's value changes.
 */
export function useFormValue<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
  N extends keyof TFields & string,
>(
  bundle: UseFormEngineReturn<TApi, TContext, TFields>,
  name: N,
): FormValueOf<TApi, TFields[N]> {
  const store = bundle.internals.form.store;
  const subscribe = useMemo(
    () => (listener: () => void) => {
      const subscription = store.subscribe(listener);
      return typeof subscription === "function"
        ? (subscription as () => void)
        : () => (subscription as { unsubscribe: () => void }).unsubscribe();
    },
    [store],
  );
  return useSyncExternalStore(subscribe, () =>
    bundle.internals.form.getFieldValue(name as never),
  ) as FormValueOf<TApi, TFields[N]>;
}
