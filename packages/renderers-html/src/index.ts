import type { RendererMap } from "@react-form-engine/core";
import {
  CheckboxRenderer,
  DateRenderer,
  NumberRenderer,
  SelectRenderer,
  TextRenderer,
} from "./renderers";

export type { FieldControlProps, FieldFrameProps } from "./FieldFrame";
export { FieldFrame } from "./FieldFrame";
export {
  CheckboxRenderer,
  DateRenderer,
  NumberRenderer,
  SelectRenderer,
  TextRenderer,
};

/**
 * Renderers for the built-in scalar field types, on native HTML elements.
 * List renderers join the map next.
 */
export const htmlRenderers: RendererMap = {
  text: TextRenderer,
  number: NumberRenderer,
  date: DateRenderer,
  checkbox: CheckboxRenderer,
  select: SelectRenderer,
};
