import { describe, expectTypeOf, test } from "vitest";
import type { FormEngineApi } from "../engine";
import type { FieldMap } from "../fields";
import type { KeyValueEntry } from "../registry";
import type { ListRow } from "../rows";

interface Project {
  name: string;
  budget: number;
  tags: string[];
  memberRoles: KeyValueEntry[];
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

declare const form: FormEngineApi<Project, typeof fields>;

describe("read channel", () => {
  test("scalars read their form value", () => {
    expectTypeOf(form.getValue("budget")).toEqualTypeOf<number>();
    expectTypeOf(form.getValue("visibility")).toEqualTypeOf<
      "private" | "public"
    >();
  });

  test("lists read rows", () => {
    expectTypeOf(form.getValue("tags")).toEqualTypeOf<ListRow<string>[]>();
    expectTypeOf(form.getValue("memberRoles")).toEqualTypeOf<
      ListRow<KeyValueEntry>[]
    >();
  });

  test("unknown names are rejected", () => {
    // @ts-expect-error — not a field name
    form.getValue("nope");
  });
});

describe("write channel", () => {
  test("scalars write their form value", () => {
    form.setValue("budget", 5);
    form.setValue("visibility", "private");
    // @ts-expect-error — wrong value type
    form.setValue("budget", "5");
    // @ts-expect-error — not a member of the union
    form.setValue("visibility", "internal");
  });

  test("lists write plain items — the engine owns row identity", () => {
    form.setValue("tags", ["alpha", "beta"]);
    form.setValue("memberRoles", [{ key: "owner", value: "alice" }]);
    // @ts-expect-error — rows are not writable; pass plain items
    form.setValue("tags", [{ id: "1", value: "alpha" }]);
  });
});

describe("row seeding", () => {
  test("ensureRows takes seed specs for the item type", () => {
    form.ensureRows("memberRoles", [
      {
        match: { key: "owner" },
        value: { key: "owner", value: "alice" },
        meta: { pinned: true },
      },
    ]);
  });

  test("only object-item lists are seedable", () => {
    // @ts-expect-error — string lists have no columns to seed
    form.ensureRows("tags", [{ value: "alpha" }]);
    // @ts-expect-error — scalars have no rows
    form.ensureRows("name", []);
  });

  test("removeRows scopes by ids or origin", () => {
    form.removeRows("memberRoles", ["row-1"]);
    form.removeRows("memberRoles", { origin: "seeded" });
    // @ts-expect-error — not a provenance channel
    form.removeRows("memberRoles", { origin: "machine" });
  });
});

describe("presentation channels", () => {
  test("errors, visibility, options", () => {
    form.setServerError("name", "Name already taken");
    form.clearServerError("name");
    form.setVisible("budget", false);
    expectTypeOf(form.isVisible("budget")).toEqualTypeOf<boolean>();
    form.setOptions("visibility", [{ label: "Private", value: "private" }]);
  });

  test("reset takes API-model values", () => {
    form.reset();
    form.reset({ name: "Fresh", tags: ["x"] });
    // @ts-expect-error — form-model rows are not API values
    form.reset({ tags: [{ id: "1" }] });
  });
});
