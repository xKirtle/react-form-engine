import {
  type FieldMap,
  Form,
  FormRenderers,
  type UseFormEngineReturn,
  useFormEngine,
} from "@react-form-engine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { htmlRenderers } from "../index";

interface Project {
  name: string;
  budget: number;
  dueDate: string;
  archived: boolean;
  kind: string;
}

const fields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
    description: "Shown in the project list",
    validation: { required: true },
  },
  budget: { key: "budget", type: "number", label: "Budget" },
  dueDate: { key: "dueDate", type: "date", label: "Due date" },
  archived: { key: "archived", type: "checkbox", label: "Archived" },
  kind: {
    key: "kind",
    type: "select",
    label: "Kind",
    config: {
      items: [
        { label: "Simple", value: "simple" },
        { label: "Funded", value: "funded" },
      ],
    },
  },
} as const satisfies FieldMap<Project>;

type Bundle = UseFormEngineReturn<Project, undefined, typeof fields>;
let lastBundle: Bundle;

function Harness(props: { initialValues?: Partial<Project> }) {
  const bundle = useFormEngine<Project, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["name", "budget", "dueDate", "archived", "kind"] }],
    context: undefined,
    initialErrors: "gated",
    initialValues: props.initialValues,
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

describe("accessibility", () => {
  it("has no axe violations, pristine and with a visible error", async () => {
    const { container } = render(<Harness />);
    expect(
      await axe(container, {
        rules: { "color-contrast": { enabled: false } },
      }),
    ).toHaveNoViolations();

    // reveal the required error and re-check
    fireEvent.blur(screen.getByLabelText(/Project name/));
    expect(
      await axe(container, {
        rules: { "color-contrast": { enabled: false } },
      }),
    ).toHaveNoViolations();
  });

  it("all ARIA references resolve; no duplicate ids across two forms", () => {
    const { container } = render(
      <>
        <Harness />
        <Harness />
      </>,
    );

    const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const el of container.querySelectorAll(
      "[aria-describedby], [aria-labelledby]",
    )) {
      const tokens = [
        ...(el.getAttribute("aria-describedby") ?? "").split(/\s+/),
        ...(el.getAttribute("aria-labelledby") ?? "").split(/\s+/),
      ].filter((t) => t !== "");
      for (const token of tokens) {
        expect(container.querySelector(`[id="${token}"]`)).not.toBeNull();
      }
    }
  });

  it("wires description, error, invalid, and required onto the control", () => {
    render(<Harness />);
    const input = screen.getByLabelText(/Project name/) as HTMLInputElement;
    expect(input.getAttribute("aria-required")).toBe("true");
    expect(input.getAttribute("aria-invalid")).toBeNull();

    const describedBy = input.getAttribute("aria-describedby") ?? "";
    const descriptions = describedBy
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent ?? "");
    expect(descriptions).toContain("Shown in the project list");

    fireEvent.blur(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(descriptions.length).toBe(2); // description + (initially empty) error region
  });

  it("announces errors through a polite live region", () => {
    const { container } = render(<Harness />);
    const region = container.querySelector(
      ".rfe-field--invalid .rfe-field__error, .rfe-field .rfe-field__error",
    );
    expect(region?.getAttribute("aria-live")).toBe("polite");
    expect(container.querySelector("[role='alert']")).toBeNull();
  });
});

describe("renderer behavior", () => {
  it("text edits write through; the value round-trips", () => {
    render(<Harness />);
    const input = screen.getByLabelText(/Project name/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Artemis" } });
    expect(lastBundle.engine.getValue("name")).toBe("Artemis");
  });

  it("number maps NaN to an empty input and valueAsNumber back", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Budget") as HTMLInputElement;
    expect(input.value).toBe("");

    fireEvent.change(input, { target: { value: "250" } });
    expect(lastBundle.engine.getValue("budget")).toBe(250);

    fireEvent.change(input, { target: { value: "" } });
    expect(lastBundle.engine.getValue("budget")).toBeNaN();
  });

  it("date holds the ISO string natively", () => {
    render(<Harness initialValues={{ dueDate: "2026-07-09" }} />);
    const input = screen.getByLabelText("Due date") as HTMLInputElement;
    expect(input.value).toBe("2026-07-09");
    fireEvent.change(input, { target: { value: "2026-08-01" } });
    expect(lastBundle.engine.getValue("dueDate")).toBe("2026-08-01");
  });

  it("checkbox toggles the boolean", () => {
    render(<Harness />);
    const box = screen.getByLabelText("Archived") as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(lastBundle.engine.getValue("archived")).toBe(true);
  });

  it("select offers config items and writes the selection", () => {
    render(<Harness />);
    const select = screen.getByLabelText("Kind") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual([
      "—",
      "Simple",
      "Funded",
    ]);
    fireEvent.change(select, { target: { value: "funded" } });
    expect(lastBundle.engine.getValue("kind")).toBe("funded");
  });
});
