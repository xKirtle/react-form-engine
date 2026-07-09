import type { FieldRenderProps } from "@react-form-engine/core";
import { FieldFrame, type FieldFrameProps } from "./FieldFrame";

function frameProps(
  props: FieldRenderProps,
): Omit<FieldFrameProps, "children"> {
  return {
    label: (props.definition.label as string | undefined) ?? props.name,
    description: props.definition.description as string | undefined,
    error: props.presentation.error,
    required: props.required,
  };
}

/** @group Renderers */
export function TextRenderer(props: FieldRenderProps) {
  return (
    <FieldFrame {...frameProps(props)}>
      {(control) => (
        <input
          {...control}
          className="rfe-input"
          type="text"
          value={props.value as string}
          onChange={(e) => props.setValue(e.target.value)}
          onBlur={props.markTouched}
        />
      )}
    </FieldFrame>
  );
}

/** @group Renderers */
export function NumberRenderer(props: FieldRenderProps) {
  const value = props.value as number;
  return (
    <FieldFrame {...frameProps(props)}>
      {(control) => (
        <input
          {...control}
          className="rfe-input"
          type="number"
          value={Number.isNaN(value) ? "" : value}
          onChange={(e) => props.setValue(e.target.valueAsNumber)}
          onBlur={props.markTouched}
        />
      )}
    </FieldFrame>
  );
}

/** @group Renderers */
export function DateRenderer(props: FieldRenderProps) {
  return (
    <FieldFrame {...frameProps(props)}>
      {(control) => (
        <input
          {...control}
          className="rfe-input"
          type="date"
          value={props.value as string}
          onChange={(e) => props.setValue(e.target.value)}
          onBlur={props.markTouched}
        />
      )}
    </FieldFrame>
  );
}

/** @group Renderers */
export function CheckboxRenderer(props: FieldRenderProps) {
  return (
    <FieldFrame {...frameProps(props)} className="rfe-field--checkbox">
      {(control) => (
        <input
          {...control}
          className="rfe-checkbox"
          type="checkbox"
          checked={props.value as boolean}
          onChange={(e) => props.setValue(e.target.checked)}
          onBlur={props.markTouched}
        />
      )}
    </FieldFrame>
  );
}

/** @group Renderers */
export function SelectRenderer(props: FieldRenderProps) {
  return (
    <FieldFrame {...frameProps(props)}>
      {(control) => (
        <select
          {...control}
          className="rfe-select"
          value={props.value as string}
          onChange={(e) => props.setValue(e.target.value)}
          onBlur={props.markTouched}
        >
          <option value="">—</option>
          {(props.options ?? []).map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      )}
    </FieldFrame>
  );
}
