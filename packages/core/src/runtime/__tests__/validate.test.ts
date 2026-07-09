import { describe, expect, it } from "vitest";
import type { FieldMap } from "../../types/fields";
import type { StandardSchemaV1 } from "../../types/standardSchema";
import { englishMessages, mergeMessages } from "../messages";
import { resolveModules } from "../resolver";
import { parseApiValues } from "../transforms";
import { validateFields } from "../validate";

interface Project {
  name: string;
  budget: number;
  dueDate: string;
  agreed: boolean;
  tags: string[];
  memberRoles: { key: string; value: string }[];
}

function run(
  fieldOverrides: Partial<Record<string, object>>,
  apiValues: Partial<Project>,
) {
  const fields = {
    name: { key: "name", type: "text" },
    budget: { key: "budget", type: "number" },
    dueDate: { key: "dueDate", type: "date" },
    agreed: { key: "agreed", type: "checkbox" },
    tags: { key: "tags", type: "stringList" },
    memberRoles: { key: "memberRoles", type: "keyValueList" },
  } as const satisfies FieldMap<Project>;

  const schema = resolveModules<Project, undefined, typeof fields>({
    fields,
    modules: [
      {
        fields: ["name", "budget", "dueDate", "agreed", "tags", "memberRoles"],
        overrides: fieldOverrides as never,
      },
    ],
    context: undefined,
  });
  const parsed = parseApiValues({ schema, apiValues });
  return validateFields({
    schema,
    formValues: parsed.formValues,
    messages: englishMessages,
  });
}

describe("required", () => {
  it("fails on empty values per type", () => {
    const results = run(
      {
        name: { validation: { required: true } },
        budget: { validation: { required: true } },
        agreed: { validation: { required: true } },
      },
      { name: "  " },
    );
    expect(results.get("name")?.errors).toEqual(["This field is required"]);
    expect(results.get("budget")?.errors).toEqual(["This field is required"]);
    expect(results.get("agreed")?.errors).toEqual(["This field is required"]);
  });

  it("passes on present values, honors a custom message", () => {
    const results = run(
      {
        name: { validation: { required: { message: "Name it" } } },
        budget: { validation: { required: true } },
      },
      { budget: 0 },
    );
    expect(results.get("name")?.errors).toEqual(["Name it"]);
    expect(results.get("budget")?.errors).toEqual([]); // 0 is a value
  });
});

describe("string and number rules", () => {
  it("skip range rules while the value is empty", () => {
    const results = run(
      { name: { validation: { minLength: { value: 3 } } } },
      {},
    );
    expect(results.get("name")?.errors).toEqual([]);
  });

  it("length, pattern, and bounds with default messages", () => {
    const results = run(
      {
        name: {
          validation: {
            minLength: { value: 5 },
            pattern: { value: /^[a-z]+$/ },
          },
        },
        budget: { validation: { max: { value: 100 } } },
      },
      { name: "Ab1", budget: 250 },
    );
    expect(results.get("name")?.errors).toEqual([
      "Must be at least 5 characters",
      "Invalid format",
    ]);
    expect(results.get("budget")?.errors).toEqual(["Must be at most 100"]);
  });

  it("date bounds compare ISO strings", () => {
    const results = run(
      {
        dueDate: {
          validation: {
            min: { value: "2026-01-01" },
            max: { value: "2026-12-31" },
          },
        },
      },
      { dueDate: "2025-06-15" },
    );
    expect(results.get("dueDate")?.errors).toEqual([
      "Must be on or after 2026-01-01",
    ]);
  });
});

describe("custom and schema", () => {
  it("custom sees the value and all form values", () => {
    const results = run(
      {
        budget: {
          validation: {
            custom: (budget: number, values: Record<string, unknown>) =>
              values.name === "Apollo" && budget < 1000
                ? "Apollo needs at least 1000"
                : null,
          },
        },
      },
      { name: "Apollo", budget: 5 },
    );
    expect(results.get("budget")?.errors).toEqual([
      "Apollo needs at least 1000",
    ]);
  });

  it("schema issues become field errors; async schemas throw", () => {
    const failing: StandardSchemaV1<string> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({ issues: [{ message: "Schema says no" }] }),
      },
    };
    const results = run(
      { name: { validation: { schema: failing } } },
      { name: "anything" },
    );
    expect(results.get("name")?.errors).toEqual(["Schema says no"]);

    const asyncSchema: StandardSchemaV1<string> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => Promise.resolve({ value: "x" }),
      },
    };
    expect(() =>
      run({ name: { validation: { schema: asyncSchema } } }, { name: "x" }),
    ).toThrowError(/synchronous/i);
  });
});

describe("lists", () => {
  it("blank rows are invisible to validation", () => {
    const results = run(
      { tags: { validation: { required: true, minItems: { value: 2 } } } },
      { tags: ["", " ", "infra"] },
    );
    expect(results.get("tags")?.errors).toEqual(["Add at least 2 items"]);
  });

  it("required fails when only blank rows exist", () => {
    const results = run(
      { tags: { validation: { required: true } } },
      { tags: ["", ""] },
    );
    expect(results.get("tags")?.errors).toEqual(["This field is required"]);
  });

  it("incomplete rows error per cell, addressed rowId x column", () => {
    const results = run(
      {},
      {
        memberRoles: [
          { key: "owner", value: "" },
          { key: "", value: "" }, // blank — ignored
        ],
      },
    );
    const result = results.get("memberRoles");
    expect(result?.errors).toEqual([]);
    expect(result?.cells.size).toBe(1);
    const [cellErrors] = [...(result?.cells.values() ?? [])];
    expect(cellErrors).toEqual({ value: "This field is required" });
  });

  it("custom receives unwrapped non-blank items", () => {
    const results = run(
      {
        memberRoles: {
          validation: {
            custom: (items: { key: string }[]) =>
              items.some((i) => i.key === "owner") ? null : "Needs an owner",
          },
        },
      },
      { memberRoles: [{ key: "auditor", value: "eve" }] },
    );
    expect(results.get("memberRoles")?.errors).toEqual(["Needs an owner"]);
  });
});

describe("hidden fields and messages", () => {
  it("hidden fields are skipped entirely", () => {
    const fields = {
      name: { key: "name", type: "text", validation: { required: true } },
    } as const satisfies FieldMap<Project>;
    const schema = resolveModules<Project, undefined, typeof fields>({
      fields,
      modules: [{ fields: ["name"] }],
      context: undefined,
    });
    const parsed = parseApiValues({ schema, apiValues: {} });
    const results = validateFields({
      schema,
      formValues: parsed.formValues,
      hidden: new Set(["name"]),
      messages: englishMessages,
    });
    expect(results.get("name")).toBeUndefined();
  });

  it("merged messages replace individual entries", () => {
    const messages = mergeMessages(englishMessages, {
      validation: { required: "Obligatoire" },
    });
    expect(messages.validation.required).toBe("Obligatoire");
    expect(messages.validation.pattern).toBe("Invalid format");
  });
});
