import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { formBuilder } from "../../builder";
import type { FieldMap } from "../../types/fields";
import type { FieldRenderProps, RendererMap } from "../../types/renderers";
import { Form } from "../Form";
import { FormRenderers } from "../FormRenderers";
import { type UseFormEngineReturn, useFormEngine } from "../useFormEngine";

interface Project {
  name: string;
  kind: string;
  budget: number;
}

const fields = {
  name: {
    key: "name",
    type: "text",
    label: "Name",
    validation: { required: true },
  },
  kind: { key: "kind", type: "select", label: "Kind" },
  budget: { key: "budget", type: "number", label: "Budget" },
} as const satisfies FieldMap<Project>;

interface Ctx {
  showBudget: boolean;
}

const bc = formBuilder<Project>().withFields(fields).withContext<Ctx>();
const budgetModule = bc.moduleFactory((ctx) =>
  ctx.showBudget ? { fields: ["budget"] } : null,
);

function TextRenderer(props: FieldRenderProps) {
  return (
    <div>
      <label htmlFor={props.name}>{props.definition.label}</label>
      <input
        id={props.name}
        value={props.value as string}
        onChange={(e) => props.setValue(e.target.value)}
        onBlur={props.markTouched}
      />
      {props.presentation.error !== undefined && (
        <span role="alert">{props.presentation.error}</span>
      )}
    </div>
  );
}

function SelectRenderer(props: FieldRenderProps) {
  return (
    <div>
      <label htmlFor={props.name}>{props.definition.label}</label>
      <select
        id={props.name}
        value={props.value as string}
        onChange={(e) => props.setValue(e.target.value)}
      >
        {(props.options ?? []).map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const renderers: RendererMap = {
  text: TextRenderer,
  select: SelectRenderer,
  number: TextRenderer,
};

let lastBundle: UseFormEngineReturn<Project, Ctx, typeof fields>;

function TestForm(props: {
  context?: Ctx;
  gated?: boolean;
  children?: (
    bundle: UseFormEngineReturn<Project, Ctx, typeof fields>,
  ) => React.ReactNode;
}) {
  const bundle = useFormEngine<Project, Ctx, typeof fields>({
    fields,
    modules: [{ fields: ["name", "kind"] }, budgetModule],
    context: props.context ?? { showBudget: true },
    initialErrors: props.gated === true ? "gated" : "eager",
    initialValues: { name: "Apollo", kind: "simple" },
  });
  lastBundle = bundle;
  return (
    <FormRenderers renderers={renderers}>
      <Form form={bundle}>
        {props.children === undefined ? (
          <Form.AutoFields />
        ) : (
          props.children(bundle)
        )}
      </Form>
    </FormRenderers>
  );
}

describe("Field rendering", () => {
  it("renders through the mapped renderer with computed props", () => {
    render(<TestForm />);
    const input = screen.getByLabelText("Name") as HTMLInputElement;
    expect(input.value).toBe("Apollo");
  });

  it("typing writes through the user channel; blur reveals gated errors", () => {
    render(<TestForm gated />);
    const input = screen.getByLabelText("Name") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "" } });
    expect(lastBundle.isDirty).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.blur(input);
    expect(screen.getByRole("alert").textContent).toBe(
      "This field is required",
    );
  });

  it("throws on unknown field names", () => {
    expect(() =>
      render(<TestForm>{() => <Form.Field name="nope" />}</TestForm>),
    ).toThrowError(/not a field of this form/);
  });
});

describe("AutoFields", () => {
  it("renders resolved fields in schema order", () => {
    const { container } = render(<TestForm />);
    const labels = [...container.querySelectorAll("label")].map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(["Name", "Kind", "Budget"]);
  });

  it("skips fields claimed by an explicit Form.Field", () => {
    render(
      <TestForm>
        {() => (
          <>
            <Form.Field name="name" />
            <Form.AutoFields />
          </>
        )}
      </TestForm>,
    );
    expect(screen.getAllByLabelText("Name")).toHaveLength(1);
  });

  it("honors except", () => {
    render(<TestForm>{() => <Form.AutoFields except={["kind"]} />}</TestForm>);
    expect(screen.queryByLabelText("Kind")).toBeNull();
  });

  it("drops fields when a context change removes them", () => {
    const { rerender } = render(<TestForm context={{ showBudget: true }} />);
    expect(screen.getByLabelText("Budget")).toBeDefined();

    rerender(<TestForm context={{ showBudget: false }} />);
    expect(screen.queryByLabelText("Budget")).toBeNull();
  });
});

describe("visibility", () => {
  it("hidden fields render nothing and reappear when shown", () => {
    render(<TestForm />);
    act(() => {
      lastBundle.engine.setVisible("kind", false);
    });
    expect(screen.queryByLabelText("Kind")).toBeNull();

    act(() => {
      lastBundle.engine.setVisible("kind", true);
    });
    expect(screen.getByLabelText("Kind")).toBeDefined();
  });
});

describe("render props", () => {
  it("function children may use hooks", () => {
    render(
      <TestForm>
        {() => (
          <Form.Field name="name">
            {(api) => {
              const [focused, setFocused] = useState(false);
              return (
                <input
                  aria-label="custom-name"
                  data-focused={focused}
                  value={api.value as string}
                  onFocus={() => setFocused(true)}
                  onChange={(e) => api.setValue(e.target.value)}
                />
              );
            }}
          </Form.Field>
        )}
      </TestForm>,
    );
    const input = screen.getByLabelText("custom-name") as HTMLInputElement;
    expect(input.value).toBe("Apollo");
    fireEvent.focus(input);
    expect(input.dataset.focused).toBe("true");
  });
});

describe("options", () => {
  it("engine-set options reach the renderer", () => {
    render(<TestForm />);
    act(() => {
      lastBundle.engine.setOptions("kind", [
        { label: "Simple", value: "simple" },
        { label: "Funded", value: "funded" },
      ]);
    });
    const select = screen.getByLabelText("Kind") as HTMLSelectElement;
    expect(select.options).toHaveLength(2);
  });
});
