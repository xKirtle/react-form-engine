import { describe, expect, it } from "vitest";
import type { FieldMap } from "../../types/fields";
import type { ModuleInput } from "../../types/modules";
import { resolveModules } from "../resolver";

interface Project {
  name: string;
  budget: number;
  currency: string;
  settings: {
    visibility: "private" | "public";
  };
}

const fields = {
  name: { key: "name", type: "text", label: "Name" },
  budget: { key: "budget", type: "number", label: "Budget" },
  visibility: { key: "settings.visibility", type: "select" },
} as const satisfies FieldMap<Project>;

type Fields = typeof fields;

interface Ctx {
  showBudget: boolean;
}

function resolve(
  modules: readonly ModuleInput<Project, Ctx, Fields>[],
  context: Ctx = { showBudget: true },
) {
  return resolveModules<Project, Ctx, Fields>({ fields, modules, context });
}

describe("field resolution", () => {
  it("resolves fields in first-appearance order", () => {
    const schema = resolve([
      { fields: ["visibility", "name"] },
      { fields: ["budget", "name"] },
    ]);
    expect([...schema.fields.keys()]).toEqual(["visibility", "name", "budget"]);
  });

  it("takes definitions from the field map", () => {
    const schema = resolve([{ fields: ["name"] }]);
    expect(schema.fields.get("name")).toEqual(fields.name);
  });

  it("throws on an unknown field name", () => {
    expect(() => resolve([{ fields: ["name", "nope" as never] }])).toThrowError(
      /unknown field "nope"/,
    );
  });
});

describe("overrides", () => {
  it("merge shallowly onto the definition, override wins per property", () => {
    const schema = resolve([
      {
        fields: ["name"],
        overrides: { name: { label: "Codename" } },
      },
    ]);
    expect(schema.fields.get("name")).toEqual({
      key: "name",
      type: "text",
      label: "Codename",
    });
  });

  it("later overrides win", () => {
    const schema = resolve([
      { fields: ["name"], overrides: { name: { label: "First" } } },
      { fields: [], overrides: { name: { label: "Second" } } },
    ]);
    expect(schema.fields.get("name")?.label).toBe("Second");
  });

  it("apply to fields included by any module, in any order", () => {
    const schema = resolve([
      { fields: [], overrides: { budget: { label: "Budget (EUR)" } } },
      { fields: ["budget"] },
    ]);
    expect(schema.fields.get("budget")?.label).toBe("Budget (EUR)");
  });

  it("for fields never included are ignored", () => {
    const schema = resolve([
      { fields: ["name"], overrides: { budget: { label: "Ghost" } } },
    ]);
    expect(schema.fields.has("budget")).toBe(false);
  });

  it("throw on an unknown override target", () => {
    expect(() =>
      resolve([
        { fields: ["name"], overrides: { nope: { label: "X" } } as never },
      ]),
    ).toThrowError(/unknown field "nope"/);
  });

  it("do not mutate the field map's definitions", () => {
    resolve([{ fields: ["name"], overrides: { name: { label: "Changed" } } }]);
    expect(fields.name.label).toBe("Name");
  });
});

describe("factories", () => {
  it("receive the context and may opt out with null", () => {
    const modules: readonly ModuleInput<Project, Ctx, Fields>[] = [
      { fields: ["name"] },
      (ctx) => (ctx.showBudget ? { fields: ["budget"] } : null),
    ];
    expect([...resolve(modules, { showBudget: true }).fields.keys()]).toEqual([
      "name",
      "budget",
    ]);
    expect([...resolve(modules, { showBudget: false }).fields.keys()]).toEqual([
      "name",
    ]);
  });
});

describe("rules and defaults", () => {
  it("collects rules in module order", () => {
    const ruleA = { watch: ["name"] } as const;
    const ruleB = { watch: ["budget"] } as const;
    const schema = resolve([
      { fields: ["name"], rules: [ruleA] },
      { fields: ["budget"], rules: [ruleB] },
    ]);
    expect(schema.rules).toEqual([ruleA, ruleB]);
  });

  it("merges defaults, later modules win", () => {
    const schema = resolve([
      { fields: ["name"], defaults: { currency: "EUR", name: "Untitled" } },
      { fields: [], defaults: { currency: "USD" } },
    ]);
    expect(schema.defaults).toEqual({ currency: "USD", name: "Untitled" });
  });
});
