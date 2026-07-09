import {
  type FieldMap,
  Form,
  FormRenderers,
  type UseFormEngineReturn,
  useFormEngine,
} from "@react-form-engine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { htmlRenderers } from "../index";

interface Project {
  tags: string[];
  memberRoles: { key: string; value: string }[];
}

const fields = {
  tags: { key: "tags", type: "stringList", label: "Tags" },
  memberRoles: {
    key: "memberRoles",
    type: "keyValueList",
    label: "Member roles",
    knownRows: [
      { match: { key: "owner" }, meta: { pinned: true, keyReadOnly: true } },
    ],
  },
} as const satisfies FieldMap<Project>;

type Bundle = UseFormEngineReturn<Project, undefined, typeof fields>;
let lastBundle: Bundle;

function Harness(props: {
  initialValues?: Partial<Project>;
  messages?: { lists?: { add?: string } };
}) {
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["tags", "memberRoles"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: props.initialValues,
    messages: props.messages,
  });
  lastBundle = bundle;
  return (
    <FormRenderers renderers={htmlRenderers}>
      <Form form={bundle}>
        <Form.AutoFields />
      </Form>
    </FormRenderers>
  );
}

const initialValues: Partial<Project> = {
  tags: ["infra", "urgent"],
  memberRoles: [
    { key: "owner", value: "alice" },
    { key: "auditor", value: "eve" },
  ],
};

describe("accessibility", () => {
  it("has no axe violations, including with visible cell errors", async () => {
    const { container } = render(
      <Harness
        initialValues={{
          ...initialValues,
          memberRoles: [{ key: "owner", value: "" }],
        }}
      />,
    );
    fireEvent.blur(screen.getByLabelText("Value, row 1 (owner)"));
    expect(
      await axe(container, {
        rules: { "color-contrast": { enabled: false } },
      }),
    ).toHaveNoViolations();
  });

  it("names rows in cell labels and remove buttons", () => {
    render(<Harness initialValues={initialValues} />);
    expect(screen.getByLabelText("Key, row 2 (auditor)")).toBeDefined();
    expect(screen.getByLabelText("Remove row 2 (auditor)")).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(screen.getByLabelText("Value, row 1 (infra)")).toBeDefined();
    expect(screen.getByLabelText("Remove row 1 (infra)")).toBeDefined();
  });
});

describe("keyValueList", () => {
  it("edits cells in place", () => {
    render(<Harness initialValues={initialValues} />);
    fireEvent.change(screen.getByLabelText("Value, row 2 (auditor)"), {
      target: { value: "sam" },
    });
    expect(lastBundle.engine.getValue("memberRoles")[1]?.value).toEqual({
      key: "auditor",
      value: "sam",
    });
  });

  it("knownRows meta locks the key cell and the remove button", () => {
    render(<Harness initialValues={initialValues} />);
    const keyCell = screen.getByLabelText(
      "Key, row 1 (owner)",
    ) as HTMLInputElement;
    expect(keyCell.readOnly).toBe(true);
    expect(
      (screen.getByLabelText("Remove row 1 (owner)") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("reveals a cell error on blur, wired to the input", () => {
    render(
      <Harness
        initialValues={{ memberRoles: [{ key: "owner", value: "" }] }}
      />,
    );
    const cell = screen.getByLabelText("Value, row 1 (owner)");
    expect(cell.getAttribute("aria-invalid")).toBeNull();

    fireEvent.blur(cell);
    expect(cell.getAttribute("aria-invalid")).toBe("true");
    const errorId = cell.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(errorId)?.textContent).toBe(
      "This field is required",
    );
  });

  it("add appends and canAdd blocks on incomplete rows", () => {
    render(<Harness initialValues={initialValues} />);
    const group = screen.getByRole("group", { name: /Member roles/ });
    const add = within(group).getByText("Add item") as HTMLButtonElement;
    fireEvent.click(add);
    expect(lastBundle.engine.getValue("memberRoles")).toHaveLength(3);
    expect(add.disabled).toBe(true);
  });

  it("remove works with the keyboard", async () => {
    const user = userEvent.setup();
    render(<Harness initialValues={initialValues} />);
    const remove = screen.getByLabelText("Remove row 2 (auditor)");
    remove.focus();
    await user.keyboard("{Enter}");
    expect(lastBundle.engine.getValue("memberRoles")).toHaveLength(1);
  });
});

describe("stringList", () => {
  it("edits and removes items", () => {
    render(<Harness initialValues={initialValues} />);
    fireEvent.change(screen.getByLabelText("Value, row 1 (infra)"), {
      target: { value: "platform" },
    });
    expect(lastBundle.engine.getValue("tags").map((row) => row.value)).toEqual([
      "platform",
      "urgent",
    ]);

    fireEvent.click(screen.getByLabelText("Remove row 2 (urgent)"));
    expect(lastBundle.engine.getValue("tags")).toHaveLength(1);
  });
});

describe("localization", () => {
  it("list mechanics read from the messages", () => {
    render(
      <Harness
        initialValues={initialValues}
        messages={{ lists: { add: "Ajouter" } }}
      />,
    );
    expect(screen.getAllByText("Ajouter")).toHaveLength(2);
    expect(screen.queryByText("Add item")).toBeNull();
  });
});
