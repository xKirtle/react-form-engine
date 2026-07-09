import { describe, expectTypeOf, test } from "vitest";
import type { FieldMap } from "../fields";
import type { KeyValueEntry } from "../registry";
import type {
  ListRow,
  RowListKeys,
  RowMeta,
  RowOrigin,
  RowSeedSpec,
} from "../rows";
import type { FormValueOf } from "../values";

declare function accepts<T>(value: T): void;

interface Project {
  name: string;
  tags: string[];
  labels: string[];
  memberRoles: KeyValueEntry[];
}

const fields = {
  name: { key: "name", type: "text" },
  tags: { key: "tags", type: "stringList" },
  memberRoles: { key: "memberRoles", type: "keyValueList" },
  labels: {
    key: "labels",
    type: "keyValueList",
    transform: {
      parse: (api) => api.map((s) => ({ key: s, value: "" })),
      serialize: (entries) => entries.map((e) => e.key),
    },
  },
} as const satisfies FieldMap<Project>;

type Fields = typeof fields;

describe("ListRow", () => {
  test("identity and provenance are read-only", () => {
    expectTypeOf<ListRow<string>["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ListRow<string>["origin"]>().toEqualTypeOf<RowOrigin>();
    expectTypeOf<RowOrigin>().toEqualTypeOf<"api" | "seeded" | "user">();
  });

  test("meta accepts engine flags and consumer data", () => {
    accepts<RowMeta>({ pinned: true });
    accepts<RowMeta>({ keyReadOnly: true, invoiceGroup: "external" });
  });
});

describe("row wrapping in the form model", () => {
  test("list domains wrap their items in rows", () => {
    expectTypeOf<FormValueOf<Project, Fields["tags"]>>().toEqualTypeOf<
      ListRow<string>[]
    >();
    expectTypeOf<FormValueOf<Project, Fields["memberRoles"]>>().toEqualTypeOf<
      ListRow<KeyValueEntry>[]
    >();
  });

  test("transformed lists wrap the parse output's items", () => {
    expectTypeOf<FormValueOf<Project, Fields["labels"]>>().toEqualTypeOf<
      ListRow<{ key: string; value: string }>[]
    >();
  });

  test("scalar domains stay unwrapped", () => {
    expectTypeOf<
      FormValueOf<Project, Fields["name"]>
    >().toEqualTypeOf<string>();
  });
});

describe("RowListKeys", () => {
  test("selects only object-item lists", () => {
    expectTypeOf<RowListKeys<Project, Fields>>().toEqualTypeOf<
      "memberRoles" | "labels"
    >();
  });
});

describe("RowSeedSpec", () => {
  test("value is the item type; match is a partial of it", () => {
    accepts<RowSeedSpec<KeyValueEntry>>({
      match: { key: "owner" },
      value: { key: "owner", value: "alice" },
      meta: { pinned: true },
    });
    accepts<RowSeedSpec<KeyValueEntry>>({
      // @ts-expect-error — match must be a partial of the item
      match: { name: "owner" },
      value: { key: "owner", value: "alice" },
    });
  });
});
