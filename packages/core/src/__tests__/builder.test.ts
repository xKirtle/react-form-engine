import { describe, expect, it } from "vitest";
import { formBuilder } from "../builder";
import type { FieldMap } from "../types/fields";

interface Project {
  name: string;
}

const fields = {
  name: { key: "name", type: "text" },
} as const satisfies FieldMap<Project>;

describe("formBuilder", () => {
  const b = formBuilder<Project>().withFields(fields);

  it("returns rules, modules, and factories unchanged", () => {
    const rule = { watch: ["name"] } as const;
    const module = { fields: ["name"] } as const;
    const factory = () => null;

    expect(b.rule(rule)).toBe(rule);
    expect(b.module(module)).toBe(module);
    expect(b.moduleFactory(factory)).toBe(factory);
  });

  it("withContext keeps the same behavior", () => {
    const bc = b.withContext<{ flag: boolean }>();
    const module = { fields: ["name"] } as const;
    expect(bc.module(module)).toBe(module);
  });
});
