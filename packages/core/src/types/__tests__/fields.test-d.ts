import { describe, expectTypeOf, test } from "vitest";
import type { FieldDefinition, FieldMap } from "../fields";

declare function accepts<T>(value: T): void;

interface Project {
  name: string;
  budget: number;
  archived: boolean;
  createdAt: Date;
  dueDate: string;
  nickname?: string;
  tags: string[];
  settings: {
    visibility: "private" | "public";
  };
}

describe("a well-formed field map", () => {
  const fields = {
    name: {
      key: "name",
      type: "text",
      label: "Project name",
      validation: { required: true, maxLength: { value: 60 } },
    },
    budget: {
      key: "budget",
      type: "number",
      validation: { min: { value: 0 } },
      defaultValue: 0,
    },
    archived: {
      key: "archived",
      type: "checkbox",
      defaultValue: false,
    },
    dueDate: {
      key: "dueDate",
      type: "date",
    },
    // map name is an alias; the definition addresses a nested path
    visibility: {
      key: "settings.visibility",
      type: "select",
      config: {
        items: [
          { label: "Private", value: "private" },
          { label: "Public", value: "public" },
        ],
      },
      defaultValue: "private",
    },
    tags: {
      key: "tags",
      type: "stringList",
    },
  } as const satisfies FieldMap<Project>;

  test("compiles and preserves literal types", () => {
    expectTypeOf(fields.visibility.defaultValue).toEqualTypeOf<"private">();
    expectTypeOf(fields.name.type).toEqualTypeOf<"text">();
  });
});

describe("transform-required-on-mismatch", () => {
  test("matching types need no transform", () => {
    accepts<FieldDefinition<Project>>({ key: "name", type: "text" });
    // literal-union API value fits the select domain (string)
    accepts<FieldDefinition<Project>>({
      key: "settings.visibility",
      type: "select",
    });
  });

  test("an optional API value still matches its domain", () => {
    accepts<FieldDefinition<Project>>({ key: "nickname", type: "text" });
  });

  test("a mismatched binding without a transform is rejected", () => {
    // @ts-expect-error — number field on a string key requires a transform
    accepts<FieldDefinition<Project>>({ key: "name", type: "number" });
    // @ts-expect-error — Date API value on a date field (ISO string domain)
    accepts<FieldDefinition<Project>>({ key: "createdAt", type: "date" });
    // @ts-expect-error — string[] does not fit keyValueList entries
    accepts<FieldDefinition<Project>>({ key: "tags", type: "keyValueList" });
  });

  test("a transform reconciles the mismatch, fully typed", () => {
    accepts<FieldDefinition<Project>>({
      key: "createdAt",
      type: "date",
      transform: {
        // parameters are contextually typed: d is Date, iso is string
        parse: (d) => d.toISOString().slice(0, 10),
        serialize: (iso) => new Date(iso),
      },
    });
    accepts<FieldDefinition<Project>>({
      key: "tags",
      type: "keyValueList",
      transform: {
        parse: (api) => api.map((s) => ({ key: s, value: "" })),
        serialize: (entries) => entries.map((e) => e.key),
      },
    });
  });

  test("a transform with wrong shapes is rejected", () => {
    accepts<FieldDefinition<Project>>({
      key: "createdAt",
      type: "date",
      // @ts-expect-error — parse must return the date domain (string)
      transform: { parse: (d: Date) => d, serialize: () => new Date() },
    });
  });
});

describe("definition slots follow the declared type", () => {
  test("validation vocabulary is the field type's", () => {
    accepts<FieldDefinition<Project>>({
      key: "budget",
      type: "number",
      // @ts-expect-error — maxLength is not a number rule
      validation: { maxLength: { value: 3 } },
    });
  });

  test("config belongs to types that declare one", () => {
    // @ts-expect-error — text declares no config
    accepts<FieldDefinition<Project>>({
      key: "name",
      type: "text",
      config: { items: [] },
    });
  });

  test("defaultValue is the form-model value", () => {
    // @ts-expect-error — not a member of the API value's literal union
    accepts<FieldDefinition<Project>>({
      key: "settings.visibility",
      type: "select",
      defaultValue: "hidden",
    });
  });
});

describe("keys are validated paths", () => {
  test("unknown keys are rejected", () => {
    // @ts-expect-error — not a path into Project
    accepts<FieldDefinition<Project>>({ key: "nope", type: "text" });
    // @ts-expect-error — array elements are not addressable
    accepts<FieldDefinition<Project>>({ key: "tags.0", type: "text" });
  });
});
