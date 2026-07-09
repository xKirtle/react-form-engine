import { describe, expect, it } from "vitest";
import type { FieldMap } from "../../types/fields";
import type { ListRow } from "../../types/rows";
import { resolveModules } from "../resolver";
import { parseApiValues, serializeFormValues } from "../transforms";

interface Project {
  name: string;
  budget: number;
  archived: boolean;
  currency: string;
  tags: string[];
  labels: string[];
  settings: {
    visibility: "private" | "public";
  };
}

const fields = {
  name: { key: "name", type: "text" },
  budget: { key: "budget", type: "number" },
  archived: { key: "archived", type: "checkbox" },
  visibility: {
    key: "settings.visibility",
    type: "select",
    defaultValue: "private",
  },
  tags: { key: "tags", type: "stringList" },
  labels: {
    key: "labels",
    type: "keyValueList",
    transform: {
      parse: (api: string[]) => api.map((s) => ({ key: s, value: "" })),
      serialize: (entries: { key: string; value: string }[]) =>
        entries.map((e) => e.key),
    },
  },
} as const satisfies FieldMap<Project>;

const schema = resolveModules<Project, undefined, typeof fields>({
  fields,
  modules: [
    {
      fields: ["name", "budget", "archived", "visibility", "tags", "labels"],
      defaults: { currency: "EUR" },
    },
  ],
  context: undefined,
});

const apiValues: Partial<Project> = {
  name: "Apollo",
  tags: ["infra", "urgent"],
  labels: ["env"],
  settings: { visibility: "public" },
};

describe("parse", () => {
  const parsed = parseApiValues({ schema, apiValues });

  it("reads values at the definition's key, including nested paths", () => {
    expect(parsed.formValues.name).toBe("Apollo");
    expect(parsed.formValues.visibility).toBe("public");
  });

  it("applies transforms", () => {
    const rows = parsed.formValues.labels as ListRow<unknown>[];
    expect(rows.map((r) => r.value)).toEqual([{ key: "env", value: "" }]);
  });

  it("wraps list values in api-origin rows", () => {
    const rows = parsed.formValues.tags as ListRow<unknown>[];
    expect(rows.map((r) => r.value)).toEqual(["infra", "urgent"]);
    expect(rows.every((r) => r.origin === "api")).toBe(true);
  });

  it("falls back to defaultValue, then the type's empty value", () => {
    const empty = parseApiValues({ schema, apiValues: {} });
    expect(empty.formValues.visibility).toBe("private"); // defaultValue
    expect(empty.formValues.name).toBe(""); // text empty
    expect(empty.formValues.budget).toBeNaN(); // number empty
    expect(empty.formValues.archived).toBe(false); // checkbox empty
    expect(empty.formValues.tags).toEqual([]); // list empty
  });

  it("fills absent API paths from module defaults", () => {
    expect(parsed.passthrough.currency).toBe("EUR");
  });

  it("keeps unknown API keys in the passthrough", () => {
    const withExtra = parseApiValues({
      schema,
      apiValues: { ...apiValues, unknownKey: 42 } as Partial<Project>,
    });
    expect(withExtra.passthrough.unknownKey).toBe(42);
  });

  it("does not mutate the input", () => {
    expect(apiValues.currency).toBeUndefined();
  });
});

describe("serialize", () => {
  const parsed = parseApiValues({ schema, apiValues });

  it("round-trips: writes at keys, unwraps rows, applies transforms", () => {
    const out = serializeFormValues({
      schema,
      formValues: parsed.formValues,
      passthrough: parsed.passthrough,
    });
    expect(out).toEqual({
      name: "Apollo",
      archived: false,
      currency: "EUR",
      tags: ["infra", "urgent"],
      labels: ["env"],
      settings: { visibility: "public" },
    });
  });

  it("omits NaN numbers (absent, never edited)", () => {
    const out = serializeFormValues({
      schema,
      formValues: parsed.formValues,
      passthrough: parsed.passthrough,
    });
    expect("budget" in out).toBe(false);
  });

  it("drops blank list items", () => {
    const withBlank = parseApiValues({
      schema,
      apiValues: { tags: ["infra", " ", ""] },
    });
    const out = serializeFormValues({
      schema,
      formValues: withBlank.formValues,
      passthrough: withBlank.passthrough,
    });
    expect(out.tags).toEqual(["infra"]);
  });

  describe("hidden fields", () => {
    const hidden = new Set(["name"]);

    it("omit (default): the key disappears, even from passthrough data", () => {
      const out = serializeFormValues({
        schema,
        formValues: parsed.formValues,
        passthrough: parsed.passthrough,
        hidden,
      });
      expect("name" in out).toBe(false);
    });

    it("null via the form-level default", () => {
      const out = serializeFormValues({
        schema,
        formValues: parsed.formValues,
        passthrough: parsed.passthrough,
        hidden,
        hiddenValues: "null",
      });
      expect(out.name).toBeNull();
    });

    it("per-field whenHidden wins over the form default", () => {
      const keepSchema = resolveModules<Project, undefined, typeof fields>({
        fields,
        modules: [
          {
            fields: ["name"],
            overrides: { name: { whenHidden: "keep" } },
          },
        ],
        context: undefined,
      });
      const p = parseApiValues({ schema: keepSchema, apiValues });
      const out = serializeFormValues({
        schema: keepSchema,
        formValues: p.formValues,
        passthrough: p.passthrough,
        hidden,
        hiddenValues: "null",
      });
      expect(out.name).toBe("Apollo");
    });
  });
});
