import type { RendererMap } from "@react-form-engine/core";
import { KeyValueListRenderer, StringListRenderer } from "./listRenderers";
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
  KeyValueListRenderer,
  NumberRenderer,
  SelectRenderer,
  StringListRenderer,
  TextRenderer,
};

/** Renderers for every built-in field type, on native HTML elements. */
export const htmlRenderers: RendererMap = {
  text: TextRenderer,
  number: NumberRenderer,
  date: DateRenderer,
  checkbox: CheckboxRenderer,
  select: SelectRenderer,
  stringList: StringListRenderer,
  keyValueList: KeyValueListRenderer,
};
