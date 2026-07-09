import type { FieldRenderProps, RendererMap } from "@react-form-engine/core";
import { useListField } from "@react-form-engine/core";
import { FieldFrame, htmlRenderers } from "@react-form-engine/renderers-html";

/**
 * Scalars come from @react-form-engine/renderers-html; the key/value list
 * renderer below stays scratch until the package ships list renderers.
 */
function KeyValueListRenderer(props: FieldRenderProps) {
  const list = useListField<{ key: string; value: string }>(props.name);
  return (
    <FieldFrame
      label={(props.definition.label as string | undefined) ?? props.name}
      error={props.presentation.error}
      required={props.required}
      asGroup
    >
      {() => (
        <>
          {list.items.map((item) => (
            <div
              key={item.id}
              style={{ display: "flex", gap: 6, marginBottom: 4 }}
            >
              <input
                aria-label="key"
                placeholder="key"
                value={item.value.key}
                readOnly={item.meta.keyReadOnly === true}
                onChange={(e) =>
                  item.update({ ...item.value, key: e.target.value })
                }
                onBlur={() => item.markCellTouched("key")}
                style={{
                  borderColor:
                    item.errors.key !== undefined ? "crimson" : undefined,
                }}
              />
              <input
                aria-label="value"
                placeholder="value"
                value={item.value.value}
                onChange={(e) =>
                  item.update({ ...item.value, value: e.target.value })
                }
                onBlur={() => item.markCellTouched("value")}
                style={{
                  borderColor:
                    item.errors.value !== undefined ? "crimson" : undefined,
                }}
              />
              <button
                type="button"
                onClick={item.remove}
                disabled={item.meta.pinned === true}
                title={item.meta.pinned === true ? "Pinned" : "Remove"}
              >
                ✕
              </button>
              <small style={{ alignSelf: "center", color: "#888" }}>
                {item.origin}
              </small>
            </div>
          ))}
          <button
            type="button"
            disabled={!list.canAdd}
            onClick={() => list.add({ key: "", value: "" })}
          >
            Add row
          </button>
        </>
      )}
    </FieldFrame>
  );
}

export const scratchRenderers: RendererMap = {
  ...htmlRenderers,
  keyValueList: KeyValueListRenderer,
};
