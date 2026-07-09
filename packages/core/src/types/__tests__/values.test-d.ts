import { describe, expectTypeOf, test } from "vitest";
import type { FieldMap } from "../fields";
import type { KeyValueEntry } from "../registry";
import type { ListRow } from "../rows";
import type { FormValueOf, FormValuesOf } from "../values";

interface Project {
  name: string;
  budget: number;
  createdAt: Date;
  nickname?: string;
  tags: string[];
  settings: {
    visibility: "private" | "public";
  };
}

const fields = {
  name: {
    key: "name",
    type: "text",
  },
  budget: {
    key: "budget",
    type: "number",
    defaultValue: 0,
  },
  visibility: {
    key: "settings.visibility",
    type: "select",
  },
  nickname: {
    key: "nickname",
    type: "text",
  },
  createdAt: {
    key: "createdAt",
    type: "date",
    transform: {
      parse: (d) => d.toISOString().slice(0, 10),
      serialize: (iso) => new Date(iso),
    },
  },
  memberRoles: {
    key: "tags",
    type: "keyValueList",
    transform: {
      parse: (api) => api.map((s) => ({ key: s, value: "" })),
      serialize: (entries) => entries.map((e) => e.key),
    },
  },
} as const satisfies FieldMap<Project>;

type Fields = typeof fields;

describe("FormValueOf", () => {
  test("without a transform, the narrowed API value", () => {
    expectTypeOf<
      FormValueOf<Project, Fields["name"]>
    >().toEqualTypeOf<string>();
    expectTypeOf<
      FormValueOf<Project, Fields["budget"]>
    >().toEqualTypeOf<number>();
  });

  test("literal API types survive", () => {
    expectTypeOf<FormValueOf<Project, Fields["visibility"]>>().toEqualTypeOf<
      "private" | "public"
    >();
  });

  test("optional API values lose their undefined (absence is a parse concern)", () => {
    expectTypeOf<
      FormValueOf<Project, Fields["nickname"]>
    >().toEqualTypeOf<string>();
  });

  test("with a transform, the parse output (lists wrapped in rows)", () => {
    expectTypeOf<
      FormValueOf<Project, Fields["createdAt"]>
    >().toEqualTypeOf<string>();
    expectTypeOf<FormValueOf<Project, Fields["memberRoles"]>>().toEqualTypeOf<
      ListRow<{ key: string; value: string }>[]
    >();
  });
});

describe("FormValuesOf", () => {
  test("maps every field name to its form value", () => {
    expectTypeOf<FormValuesOf<Project, Fields>>().toEqualTypeOf<{
      name: string;
      budget: number;
      visibility: "private" | "public";
      nickname: string;
      createdAt: string;
      memberRoles: ListRow<{ key: string; value: string }>[];
    }>();
  });

  test("keyValueList without a transform keeps its entry domain", () => {
    interface Api {
      pairs: KeyValueEntry[];
    }
    const map = {
      pairs: { key: "pairs", type: "keyValueList" },
    } as const satisfies FieldMap<Api>;
    expectTypeOf<FormValueOf<Api, (typeof map)["pairs"]>>().toEqualTypeOf<
      ListRow<KeyValueEntry>[]
    >();
  });
});
