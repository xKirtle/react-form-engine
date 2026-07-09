import { describe, expect, it } from "vitest";
import type { FieldMap } from "../../types/fields";
import { createEngine } from "../engine";
import { englishMessages } from "../messages";
import { resolveModules } from "../resolver";
import { createValidationController } from "../validationState";

interface Project {
  name: string;
  budget: number;
  memberRoles: { key: string; value: string }[];
}

const fields = {
  name: {
    key: "name",
    type: "text",
    validation: { required: true, maxLength: { value: 10 } },
  },
  budget: { key: "budget", type: "number" },
  memberRoles: { key: "memberRoles", type: "keyValueList" },
} as const satisfies FieldMap<Project>;

function setup(
  apiValues: Partial<Project>,
  initialErrors: "eager" | "gated" = "eager",
) {
  const schema = resolveModules<Project, undefined, typeof fields>({
    fields,
    modules: [{ fields: ["name", "budget", "memberRoles"] }],
    context: undefined,
  });
  const internals = createEngine({ schema, apiValues });
  const controller = createValidationController({
    internals,
    initialErrors,
    messages: englishMessages,
  });
  controller.start();
  return { internals, controller };
}

describe("initial errors", () => {
  it("eager: invalid initial data shows immediately", () => {
    const { controller } = setup({});
    expect(controller.presentationFor("name").error).toBe(
      "This field is required",
    );
  });

  it("gated: initial errors wait for touch, reveal per field", () => {
    const { controller } = setup({}, "gated");
    expect(controller.presentationFor("name").error).toBeUndefined();
    expect(controller.presentationFor("name").invalid).toBe(true);

    controller.markTouched("name");
    expect(controller.presentationFor("name").error).toBe(
      "This field is required",
    );
  });

  it("gated: submit reveals everything", () => {
    const { controller } = setup({}, "gated");
    controller.markSubmitted();
    expect(controller.presentationFor("name").error).toBe(
      "This field is required",
    );
  });
});

describe("user-introduced errors", () => {
  it("gate on touch even under eager", () => {
    const { internals, controller } = setup({ name: "Valid" });
    internals.engine.setValue("name", "much too long for the limit");
    expect(controller.presentationFor("name").error).toBeUndefined();
    expect(controller.presentationFor("name").invalid).toBe(true);

    controller.markTouched("name");
    expect(controller.presentationFor("name").error).toBe(
      "Must be at most 10 characters",
    );
  });
});

describe("server errors", () => {
  it("show immediately, ungated", () => {
    const { internals, controller } = setup({ name: "Valid" });
    internals.engine.setServerError("name", "Name already taken");
    expect(controller.presentationFor("name").error).toBe("Name already taken");
    expect(controller.presentationFor("name").invalid).toBe(true);
  });

  it("clear automatically when the field's value changes", () => {
    const { internals, controller } = setup({ name: "Valid" });
    internals.engine.setServerError("name", "Name already taken");
    internals.engine.setValue("name", "Fresh");
    expect(controller.presentationFor("name").error).toBeUndefined();
    expect(internals.serverErrors.get("name")).toBeUndefined();
  });
});

describe("cell errors", () => {
  it("gate per cell on cell touch or submit", () => {
    const { controller } = setup({
      memberRoles: [{ key: "owner", value: "" }],
    });
    const before = controller.presentationFor("memberRoles");
    expect(before.cellErrors.size).toBe(1); // init-origin, eager

    const gated = setup(
      { memberRoles: [{ key: "owner", value: "" }] },
      "gated",
    );
    expect(
      gated.controller.presentationFor("memberRoles").cellErrors.size,
    ).toBe(0);

    const rows = gated.internals.engine.getValue("memberRoles");
    const rowId = rows[0]?.id;
    if (rowId === undefined) throw new Error("fixture");
    gated.controller.markCellTouched("memberRoles", rowId, "value");
    const after = gated.controller.presentationFor("memberRoles");
    expect(after.cellErrors.get(rowId)).toEqual({
      value: "This field is required",
    });
  });
});

describe("presentation snapshots", () => {
  it("keep their reference while nothing about the field changed", () => {
    const { internals, controller } = setup({ name: "Valid" });
    const first = controller.presentationFor("name");
    internals.engine.setValue("budget", 5);
    expect(controller.presentationFor("name")).toBe(first);
  });
});

describe("validity and lifecycle", () => {
  it("isValid reports raw validity regardless of gating", () => {
    const { internals, controller } = setup({}, "gated");
    expect(controller.isValid()).toBe(false);
    internals.engine.setValue("name", "Valid");
    expect(controller.isValid()).toBe(true);
  });

  it("hidden fields do not validate", () => {
    const { internals, controller } = setup({});
    expect(controller.isValid()).toBe(false);
    internals.engine.setVisible("name", false);
    expect(controller.isValid()).toBe(true);
  });

  it("reset clears touched, submitted, and re-snapshots init errors", () => {
    const { internals, controller } = setup({ name: "Valid" }, "gated");
    controller.markSubmitted();
    internals.engine.reset({});
    controller.reset();
    // post-reset: name is empty and invalid, but gated and untouched
    expect(controller.presentationFor("name").error).toBeUndefined();
    expect(controller.presentationFor("name").invalid).toBe(true);
  });

  it("updateSchema preserves display state for surviving fields", () => {
    const { internals, controller } = setup({}, "gated");
    controller.markTouched("name");
    expect(controller.presentationFor("name").error).toBe(
      "This field is required",
    );

    const narrower = resolveModules<Project, undefined, typeof fields>({
      fields,
      modules: [{ fields: ["name"] }],
      context: undefined,
    });
    controller.updateSchema(narrower);
    // still touched — the error stays revealed (refinement: display state
    // survives re-resolution)
    expect(controller.presentationFor("name").error).toBe(
      "This field is required",
    );
    expect(internals.isDirty()).toBe(false);
  });
});
