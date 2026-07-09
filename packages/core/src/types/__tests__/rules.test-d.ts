import { describe, expectTypeOf, test } from "vitest";
import type { FieldMap } from "../fields";
import type { KeyValueEntry } from "../registry";
import type { AnyRule, Rule, WatchedValues } from "../rules";

declare function accepts<T>(value: T): void;

interface Project {
  name: string;
  budget: number;
  memberRoles: KeyValueEntry[];
  settings: {
    visibility: "private" | "public";
  };
}

const fields = {
  name: { key: "name", type: "text" },
  budget: { key: "budget", type: "number" },
  visibility: { key: "settings.visibility", type: "select" },
  memberRoles: { key: "memberRoles", type: "keyValueList" },
} as const satisfies FieldMap<Project>;

type Fields = typeof fields;

interface BaseCtx {
  defaultOwner: string;
}
interface CreateCtx extends BaseCtx {
  template: string;
}

describe("WatchedValues", () => {
  test("maps a watch tuple to its form values, positionally", () => {
    expectTypeOf<
      WatchedValues<Project, Fields, readonly ["visibility", "budget"]>
    >().toEqualTypeOf<["private" | "public", number]>();
  });
});

describe("Rule", () => {
  test("when and apply are fully typed from the watch tuple", () => {
    accepts<Rule<Project, BaseCtx, Fields, readonly ["visibility", "budget"]>>({
      watch: ["visibility", "budget"],
      when: (visibility, budget) => visibility === "private" && budget > 0,
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
  });

  test("when rejects impossible comparisons", () => {
    accepts<Rule<Project, BaseCtx, Fields, readonly ["visibility"]>>({
      watch: ["visibility"],
      when: (visibility) => {
        // @ts-expect-error — not a member of the watched union
        return visibility === "internal";
      },
    });
  });

  test("watch keys must be field names", () => {
    // @ts-expect-error — nope is not a field
    accepts<Rule<Project, BaseCtx, Fields, readonly ["nope"]>>({
      watch: ["nope"],
    });
  });
});

describe("context variance", () => {
  test("a base-context rule serves a narrower-context form", () => {
    expectTypeOf<
      Rule<Project, BaseCtx, Fields, readonly ["budget"]>
    >().toExtend<Rule<Project, CreateCtx, Fields, readonly ["budget"]>>();
  });

  test("the reverse does not hold", () => {
    const createRule = {} as Rule<
      Project,
      CreateCtx,
      Fields,
      readonly ["budget"]
    >;
    // @ts-expect-error — a rule needing CreateCtx cannot run with BaseCtx
    accepts<Rule<Project, BaseCtx, Fields, readonly ["budget"]>>(createRule);
  });
});

describe("AnyRule storage", () => {
  test("concrete rules erase into AnyRule lists", () => {
    const rule = {} as Rule<
      Project,
      BaseCtx,
      Fields,
      readonly ["visibility", "budget"]
    >;
    accepts<AnyRule<Project, BaseCtx, Fields>>(rule);
    accepts<AnyRule<Project, CreateCtx, Fields>>(rule);
  });
});
