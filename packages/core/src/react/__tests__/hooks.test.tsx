import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FieldMap } from "../../types/fields";
import { Form } from "../Form";
import { type UseFormEngineReturn, useFormEngine } from "../useFormEngine";
import { useFormValue } from "../useFormValue";
import { useListField } from "../useListField";

interface Project {
  name: string;
  memberRoles: { key: string; value: string }[];
}

const fields = {
  name: { key: "name", type: "text" },
  memberRoles: { key: "memberRoles", type: "keyValueList" },
} as const satisfies FieldMap<Project>;

type Bundle = UseFormEngineReturn<Project, undefined, typeof fields>;

let lastBundle: Bundle;

function KvList() {
  const list = useListField<{ key: string; value: string }>("memberRoles");
  return (
    <div>
      {list.items.map((item) => (
        <div key={item.id} data-testid="row">
          <input
            aria-label={`key-${item.id}`}
            value={item.value.key}
            onChange={(e) =>
              item.update({ ...item.value, key: e.target.value })
            }
            onBlur={() => item.markCellTouched("value")}
          />
          <span data-testid={`error-${item.id}`}>
            {item.errors.value ?? ""}
          </span>
          <button
            type="button"
            aria-label={`remove-${item.id}`}
            onClick={item.remove}
          >
            x
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={!list.canAdd}
        onClick={() => list.add({ key: "", value: "" })}
      >
        add
      </button>
    </div>
  );
}

function NameEcho() {
  const name = useFormValue(lastBundle, "name");
  return <output>{name}</output>;
}

function Harness(props: { initialValues?: Partial<Project> }) {
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["name", "memberRoles"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: props.initialValues,
  });
  lastBundle = bundle;
  return (
    <Form form={bundle}>
      <KvList />
      <NameEcho />
    </Form>
  );
}

const twoRoles: Partial<Project> = {
  name: "Apollo",
  memberRoles: [
    { key: "owner", value: "alice" },
    { key: "auditor", value: "eve" },
  ],
};

describe("useListField", () => {
  it("exposes rows with identity and mechanics", () => {
    render(<Harness initialValues={twoRoles} />);
    expect(screen.getAllByTestId("row")).toHaveLength(2);
  });

  it("update edits in place, preserving row identity", () => {
    render(<Harness initialValues={twoRoles} />);
    const firstId = lastBundle.engine.getValue("memberRoles")[0]?.id;
    const input = screen.getByLabelText(`key-${firstId}`);
    fireEvent.change(input, { target: { value: "lead" } });

    const rows = lastBundle.engine.getValue("memberRoles");
    expect(rows[0]?.value.key).toBe("lead");
    expect(rows[0]?.id).toBe(firstId);
    expect(lastBundle.isDirty).toBe(true);
  });

  it("remove deletes the row", () => {
    render(<Harness initialValues={twoRoles} />);
    const firstId = lastBundle.engine.getValue("memberRoles")[0]?.id;
    fireEvent.click(screen.getByLabelText(`remove-${firstId}`));
    expect(screen.getAllByTestId("row")).toHaveLength(1);
  });

  it("add appends a user row; canAdd blocks while a row is incomplete", () => {
    render(<Harness initialValues={twoRoles} />);
    const add = screen.getByText("add") as HTMLButtonElement;
    expect(add.disabled).toBe(false);

    fireEvent.click(add);
    expect(screen.getAllByTestId("row")).toHaveLength(3);
    expect((screen.getByText("add") as HTMLButtonElement).disabled).toBe(true);
  });

  it("cell errors reveal on cell touch", () => {
    render(
      <Harness
        initialValues={{ memberRoles: [{ key: "owner", value: "" }] }}
      />,
    );
    const rowId = lastBundle.engine.getValue("memberRoles")[0]?.id;
    expect(screen.getByTestId(`error-${rowId}`).textContent).toBe("");

    fireEvent.blur(screen.getByLabelText(`key-${rowId}`));
    expect(screen.getByTestId(`error-${rowId}`).textContent).toBe(
      "This field is required",
    );
  });
});

describe("useFormValue", () => {
  it("tracks a single field's value reactively", () => {
    render(<Harness initialValues={twoRoles} />);
    expect(screen.getByRole("status").textContent).toBe("Apollo");
    fireEvent.click(screen.getByText("add")); // unrelated write
    expect(screen.getByRole("status").textContent).toBe("Apollo");
  });
});
