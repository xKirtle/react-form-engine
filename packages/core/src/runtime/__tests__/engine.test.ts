import { describe, expect, it } from "vitest";
import type { FieldMap } from "../../types/fields";
import type { ListRow } from "../../types/rows";
import { createEngine, type FormEngineInternals } from "../engine";
import { resolveModules } from "../resolver";

interface Project {
  name: string;
  budget: number;
  tags: string[];
  memberRoles: { key: string; value: string }[];
  settings: {
    visibility: "private" | "public";
  };
}

const fields = {
  name: { key: "name", type: "text" },
  budget: { key: "budget", type: "number" },
  visibility: { key: "settings.visibility", type: "select" },
  tags: { key: "tags", type: "stringList" },
  memberRoles: { key: "memberRoles", type: "keyValueList" },
} as const satisfies FieldMap<Project>;

const schema = resolveModules<Project, undefined, typeof fields>({
  fields,
  modules: [
    { fields: ["name", "budget", "visibility", "tags", "memberRoles"] },
  ],
  context: undefined,
});

const apiValues: Partial<Project> = {
  name: "Apollo",
  tags: ["infra"],
  memberRoles: [{ key: "owner", value: "alice" }],
  settings: { visibility: "public" },
};

function setup(): FormEngineInternals<Project, undefined, typeof fields> {
  return createEngine({
    schema,
    apiValues,
  });
}

describe("value channel", () => {
  it("reads parsed values", () => {
    const { engine } = setup();
    expect(engine.getValue("name")).toBe("Apollo");
    expect(engine.getValue("visibility")).toBe("public");
  });

  it("user writes update the value and dirty the form", () => {
    const internals = setup();
    internals.engine.setValue("name", "Artemis");
    expect(internals.engine.getValue("name")).toBe("Artemis");
    expect(internals.isDirty()).toBe(true);
  });

  it("rule-scope writes never dirty the form", () => {
    const internals = setup();
    internals.ruleScope.setValue("name", "Derived");
    expect(internals.engine.getValue("name")).toBe("Derived");
    expect(internals.isDirty()).toBe(false);
  });

  it("throws on unknown field names", () => {
    const { engine } = setup();
    expect(() => engine.getValue("nope" as never)).toThrowError(
      /unknown field "nope"/i,
    );
  });
});

describe("list writes", () => {
  it("user setValue wraps items as user rows", () => {
    const { engine } = setup();
    engine.setValue("tags", ["a", "b"]);
    const rows = engine.getValue("tags");
    expect(rows.map((r) => r.value)).toEqual(["a", "b"]);
    expect(rows.every((r) => r.origin === "user")).toBe(true);
  });

  it("rule-scope setValue wraps items as seeded rows", () => {
    const internals = setup();
    internals.ruleScope.setValue("tags", ["x"]);
    expect(internals.engine.getValue("tags")[0]?.origin).toBe("seeded");
  });

  it("ensureRows seeds through the row model", () => {
    const internals = setup();
    internals.ruleScope.ensureRows("memberRoles", [
      {
        match: { key: "auditor" },
        value: { key: "auditor", value: "eve" },
        meta: { pinned: true },
      },
    ]);
    const rows = internals.engine.getValue("memberRoles");
    expect(rows).toHaveLength(2);
    expect(rows[1]?.origin).toBe("seeded");
    expect(rows[1]?.meta.pinned).toBe(true);
    expect(internals.isDirty()).toBe(false);
  });

  it("removeRows by origin releases seeds", () => {
    const internals = setup();
    internals.ruleScope.ensureRows("memberRoles", [
      { match: { key: "auditor" }, value: { key: "auditor", value: "eve" } },
    ]);
    internals.ruleScope.removeRows("memberRoles", { origin: "seeded" });
    expect(internals.engine.getValue("memberRoles")).toHaveLength(1);
  });

  it("list helpers add and update rows on the user channel", () => {
    const internals = setup();
    const before = internals.engine.getValue("memberRoles");
    internals.lists.add("memberRoles", { key: "", value: "" });
    expect(internals.engine.getValue("memberRoles")).toHaveLength(2);

    const first = before[0];
    if (first === undefined) throw new Error("fixture");
    internals.lists.update("memberRoles", first.id, {
      key: "owner",
      value: "bob",
    });
    const updated = internals.engine.getValue(
      "memberRoles",
    )[0] as ListRow<unknown>;
    expect(updated.value).toEqual({ key: "owner", value: "bob" });
    expect(updated.id).toBe(first.id);
    expect(internals.isDirty()).toBe(true);
  });
});

describe("visibility", () => {
  it("is engine-owned and reflected in serialization", () => {
    const internals = setup();
    expect(internals.engine.isVisible("budget")).toBe(true);
    internals.engine.setVisible("name", false);
    expect(internals.engine.isVisible("name")).toBe(false);
    expect("name" in internals.serialize()).toBe(false);
  });

  it("notifies subscribers", () => {
    const internals = setup();
    let calls = 0;
    internals.visibility.subscribe(() => {
      calls += 1;
    });
    internals.engine.setVisible("name", false);
    internals.engine.setVisible("name", false); // no change, no notify
    expect(calls).toBe(1);
  });
});

describe("options and server errors", () => {
  it("setOptions stores and notifies", () => {
    const internals = setup();
    let notified = false;
    internals.options.subscribe(() => {
      notified = true;
    });
    internals.engine.setOptions("visibility", [
      { label: "Private", value: "private" },
    ]);
    expect(internals.options.get("visibility")).toEqual([
      { label: "Private", value: "private" },
    ]);
    expect(notified).toBe(true);
  });

  it("server errors set and clear", () => {
    const internals = setup();
    internals.engine.setServerError("name", "Taken");
    expect(internals.serverErrors.get("name")).toBe("Taken");
    internals.engine.clearServerError("name");
    expect(internals.serverErrors.get("name")).toBeUndefined();
  });
});

describe("serialize and reset", () => {
  it("serializes current values through the schema", () => {
    const internals = setup();
    internals.engine.setValue("name", "Artemis");
    const out = internals.serialize();
    expect(out.name).toBe("Artemis");
    expect(out.memberRoles).toEqual([{ key: "owner", value: "alice" }]);
  });

  it("reset re-parses and clears dirty, server errors, and visibility", () => {
    const internals = setup();
    internals.engine.setValue("name", "Artemis");
    internals.engine.setServerError("name", "Taken");
    internals.engine.setVisible("budget", false);

    internals.engine.reset();
    expect(internals.engine.getValue("name")).toBe("Apollo");
    expect(internals.isDirty()).toBe(false);
    expect(internals.serverErrors.get("name")).toBeUndefined();
    expect(internals.engine.isVisible("budget")).toBe(true);
  });

  it("reset with values parses them instead", () => {
    const internals = setup();
    internals.engine.reset({ name: "Fresh" });
    expect(internals.engine.getValue("name")).toBe("Fresh");
  });
});
