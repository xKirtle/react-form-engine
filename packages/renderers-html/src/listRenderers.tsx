import type {
  EngineMessages,
  FieldRenderProps,
  ListFieldItem,
} from "@react-form-engine/core";
import { useListField } from "@react-form-engine/core";
import { useId } from "react";
import { FieldFrame } from "./FieldFrame";

interface KeyValueItem {
  key: string;
  value: string;
}

function frameProps(props: FieldRenderProps) {
  return {
    label: (props.definition.label as string | undefined) ?? props.name,
    description: props.definition.description as string | undefined,
    error: props.presentation.error,
    required: props.required,
  };
}

export function StringListRenderer(props: FieldRenderProps) {
  const list = useListField<string>(props.name);
  return (
    <FieldFrame {...frameProps(props)} asGroup className="rfe-field--list">
      {() => (
        <div className="rfe-list">
          {list.items.map((item, index) => (
            <StringRow
              key={item.id}
              item={item}
              position={index + 1}
              messages={props.messages}
              markTouched={props.markTouched}
            />
          ))}
          <button
            type="button"
            className="rfe-list__add"
            disabled={!list.canAdd}
            onClick={() => list.add("")}
          >
            {props.messages.lists.add}
          </button>
        </div>
      )}
    </FieldFrame>
  );
}

function StringRow(props: {
  item: ListFieldItem<string>;
  position: number;
  messages: EngineMessages;
  markTouched: () => void;
}) {
  const { item, messages } = props;
  const m = messages.lists;
  const rowName = m.rowName(
    props.position,
    item.value.trim() === "" ? undefined : item.value,
  );
  return (
    <div className="rfe-list__row">
      <input
        className="rfe-input rfe-list__cell"
        aria-label={`${m.valueCell}, ${rowName}`}
        value={item.value}
        onChange={(e) => item.update(e.target.value)}
        onBlur={props.markTouched}
      />
      <button
        type="button"
        className="rfe-list__remove"
        aria-label={m.remove(rowName)}
        disabled={item.meta.pinned === true}
        onClick={item.remove}
      >
        ✕
      </button>
    </div>
  );
}

export function KeyValueListRenderer(props: FieldRenderProps) {
  const list = useListField<KeyValueItem>(props.name);
  return (
    <FieldFrame {...frameProps(props)} asGroup className="rfe-field--list">
      {() => (
        <div className="rfe-list">
          {list.items.map((item, index) => (
            <KeyValueRow
              key={item.id}
              item={item}
              position={index + 1}
              messages={props.messages}
            />
          ))}
          <button
            type="button"
            className="rfe-list__add"
            disabled={!list.canAdd}
            onClick={() => list.add({ key: "", value: "" })}
          >
            {props.messages.lists.add}
          </button>
        </div>
      )}
    </FieldFrame>
  );
}

function KeyValueRow(props: {
  item: ListFieldItem<KeyValueItem>;
  position: number;
  messages: EngineMessages;
}) {
  const { item, messages } = props;
  const m = messages.lists;
  const baseId = useId();
  const rowName = m.rowName(
    props.position,
    item.value.key.trim() === "" ? undefined : item.value.key,
  );

  return (
    <div className="rfe-list__row">
      <Cell
        id={`${baseId}-key`}
        label={`${m.keyCell}, ${rowName}`}
        value={item.value.key}
        error={item.errors.key}
        readOnly={item.meta.keyReadOnly === true}
        onChange={(key) => item.update({ ...item.value, key })}
        onBlur={() => item.markCellTouched("key")}
      />
      <Cell
        id={`${baseId}-value`}
        label={`${m.valueCell}, ${rowName}`}
        value={item.value.value}
        error={item.errors.value}
        readOnly={false}
        onChange={(value) => item.update({ ...item.value, value })}
        onBlur={() => item.markCellTouched("value")}
      />
      <button
        type="button"
        className="rfe-list__remove"
        aria-label={m.remove(rowName)}
        disabled={item.meta.pinned === true}
        onClick={item.remove}
      >
        ✕
      </button>
    </div>
  );
}

/** One cell: input plus its own always-present polite error region. */
function Cell(props: {
  id: string;
  label: string;
  value: string;
  error: string | undefined;
  readOnly: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const errorId = `${props.id}-error`;
  return (
    <span className="rfe-list__cell">
      <input
        className="rfe-input"
        id={props.id}
        aria-label={props.label}
        aria-describedby={errorId}
        aria-invalid={props.error !== undefined ? true : undefined}
        value={props.value}
        readOnly={props.readOnly}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
      />
      <span className="rfe-list__cell-error" id={errorId} aria-live="polite">
        {props.error}
      </span>
    </span>
  );
}
