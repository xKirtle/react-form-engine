import type { ComponentType } from "react";
import type { EngineMessages } from "./messages";
import type { FieldPresentation } from "./presentation";
import type { SelectItem } from "./registry";

/** The resolved definition, as a renderer sees it. */
export interface RenderedFieldDefinition {
  type: string;
  label?: string;
  description?: string;
  config?: unknown;
  [slot: string]: unknown;
}

/**
 * Everything a renderer receives — fully computed, so renderers never reach
 * back into the engine or TanStack Form. `value` is the form-model value
 * (rows for lists); renderers narrow it for their type.
 *
 * Renderers are mounted as components, never invoked as functions, so
 * hooks inside them are safe.
 */
export interface FieldRenderProps {
  name: string;
  definition: RenderedFieldDefinition;
  value: unknown;
  /** User-channel write: dirties the form. Lists take plain items. */
  setValue: (value: unknown) => void;
  /** Call on blur — gates error display. */
  markTouched: () => void;
  presentation: FieldPresentation;
  required: boolean;
  /** Engine-set options (setOptions), falling back to config items. */
  options: readonly SelectItem[] | undefined;
  messages: EngineMessages;
}

export type FieldRenderer = ComponentType<FieldRenderProps>;

/** Field type name → renderer. Mergeable via nested `FormRenderers`. */
export type RendererMap = Readonly<Record<string, FieldRenderer>>;
