import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formBuilder } from "../../builder";
import type { FieldMap } from "../../types/fields";
import { useFormEngine } from "../useFormEngine";

interface Project {
  name: string;
  kind: string;
  memberRoles: { key: string; value: string }[];
}

const fields = {
  name: {
    key: "name",
    type: "text",
    validation: { required: true },
  },
  kind: { key: "kind", type: "select" },
  memberRoles: { key: "memberRoles", type: "keyValueList" },
} as const satisfies FieldMap<Project>;

interface Ctx {
  defaultOwner: string;
  allowRoles: boolean;
}

const bc = formBuilder<Project>().withFields(fields).withContext<Ctx>();

const seedOwner = bc.rule({
  watch: ["kind"],
  when: (kind) => kind === "delegated",
  apply: (form, ctx) => {
    form.ensureRows("memberRoles", [
      {
        match: { key: "owner" },
        value: { key: "owner", value: ctx.defaultOwner },
        meta: { pinned: true },
      },
    ]);
  },
  otherwise: (form) => {
    form.removeRows("memberRoles", { origin: "seeded" });
  },
});

const baseModule = bc.module({
  fields: ["name", "kind"],
  rules: [seedOwner],
});
const rolesModule = bc.moduleFactory((ctx) =>
  ctx.allowRoles ? { fields: ["memberRoles"] } : null,
);

function renderEngine(
  overrides: {
    initialValues?: Partial<Project>;
    initialErrors?: "eager" | "gated";
    context?: Ctx;
    onSubmit?: (values: Project) => void;
  } = {},
) {
  return renderHook(
    (props: { context: Ctx }) =>
      useFormEngine<Project, Ctx, typeof fields>({
        fields,
        modules: [baseModule, rolesModule],
        context: props.context,
        initialValues: overrides.initialValues,
        initialErrors: overrides.initialErrors,
        onSubmit: overrides.onSubmit,
      }),
    {
      initialProps: {
        context: overrides.context ?? {
          defaultOwner: "alice",
          allowRoles: true,
        },
      },
    },
  );
}

describe("lifecycle", () => {
  it("parses initial values and runs the initial rule pass before snapshots", () => {
    const { result } = renderEngine({
      initialValues: { kind: "delegated" },
    });
    const rows = result.current.engine.getValue("memberRoles");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.meta.pinned).toBe(true);
    expect(result.current.isDirty).toBe(false);
  });

  it("isDirty reacts to user writes only", () => {
    const { result } = renderEngine();
    expect(result.current.isDirty).toBe(false);
    act(() => {
      result.current.engine.setValue("name", "Apollo");
    });
    expect(result.current.isDirty).toBe(true);
  });
});

describe("handleSubmit", () => {
  it("gates on validity and reveals errors", async () => {
    const onSubmit = vi.fn();
    const { result } = renderEngine({ initialErrors: "gated", onSubmit });
    expect(
      result.current.validation.presentationFor("name").error,
    ).toBeUndefined();

    await act(() => result.current.handleSubmit());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.validation.presentationFor("name").error).toBe(
      "This field is required",
    );
  });

  it("serializes and submits when valid", async () => {
    const onSubmit = vi.fn();
    const { result } = renderEngine({
      initialValues: { name: "Apollo", kind: "simple" },
      onSubmit,
    });
    await act(() => result.current.handleSubmit());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Apollo", kind: "simple" }),
    );
  });
});

describe("context identity changes", () => {
  it("re-resolves the schema in place, preserving display state", () => {
    const { result, rerender } = renderEngine({ initialErrors: "gated" });
    expect([...result.current.schema.fields.keys()]).toContain("memberRoles");

    act(() => {
      result.current.validation.markTouched("name");
    });
    expect(result.current.validation.presentationFor("name").error).toBe(
      "This field is required",
    );

    rerender({ context: { defaultOwner: "alice", allowRoles: false } });
    expect([...result.current.schema.fields.keys()]).not.toContain(
      "memberRoles",
    );
    // touched state survived the re-resolution
    expect(result.current.validation.presentationFor("name").error).toBe(
      "This field is required",
    );
    expect(result.current.isDirty).toBe(false);
  });
});

describe("reset", () => {
  it("re-parses, re-runs rules, clears dirty and display state", () => {
    const { result } = renderEngine({
      initialValues: { name: "Apollo", kind: "simple" },
      initialErrors: "gated",
    });
    act(() => {
      result.current.engine.setValue("name", "");
      result.current.validation.markTouched("name");
    });
    expect(result.current.isDirty).toBe(true);
    expect(result.current.validation.presentationFor("name").error).toBe(
      "This field is required",
    );

    act(() => {
      result.current.reset({ kind: "delegated" });
    });
    expect(result.current.isDirty).toBe(false);
    expect(
      result.current.validation.presentationFor("name").error,
    ).toBeUndefined();
    // rules re-ran against the new baseline
    expect(result.current.engine.getValue("memberRoles")).toHaveLength(1);
  });
});
