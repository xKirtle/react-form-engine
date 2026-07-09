import { createContext, useContext } from "react";
import type { ClaimRegistry } from "./claims";
import type { UseFormEngineReturn } from "./useFormEngine";

/**
 * The bundle as context components consume it. Concrete type parameters
 * are erased here — `any` deliberately, not `unknown`: `FieldMap<unknown>`
 * has no valid definitions, so an unknown-typed bundle would reject every
 * concrete one.
 */
// biome-ignore lint/suspicious/noExplicitAny: see above
export type AnyFormBundle = UseFormEngineReturn<any, any, any>;

export interface FormContextValue {
  bundle: AnyFormBundle;
  claims: ClaimRegistry;
}

export const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext(): FormContextValue {
  const value = useContext(FormContext);
  if (value === null) {
    throw new Error(
      "Form.Field and Form.AutoFields must render inside <Form>.",
    );
  }
  return value;
}
