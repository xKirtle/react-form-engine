import type { ReactNode } from "react";
import type { FieldMap } from "../types/fields";
import type { FieldRenderProps } from "../types/renderers";
import { Form } from "./Form";
import type { UseFormEngineReturn } from "./useFormEngine";

export interface TypedFormComponents<TApi, TFields extends FieldMap<TApi>> {
  Field: (props: {
    name: keyof TFields & string;
    children?: (api: FieldRenderProps) => ReactNode;
  }) => ReactNode;
  AutoFields: (props: {
    except?: readonly (keyof TFields & string)[];
    filter?: (name: keyof TFields & string) => boolean;
  }) => ReactNode;
}

/**
 * A zero-cost typed facade over `Form.Field`/`Form.AutoFields`: `name` and
 * `except` are compile-checked against the bundle's field map. The bundle
 * argument only anchors inference — the returned components are the untyped
 * originals.
 */
export function formComponentsFor<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
>(
  _bundle: UseFormEngineReturn<TApi, TContext, TFields>,
): TypedFormComponents<TApi, TFields> {
  return {
    Field: Form.Field,
    AutoFields: Form.AutoFields,
  } as unknown as TypedFormComponents<TApi, TFields>;
}
