import { describe, expectTypeOf, test } from "vitest";
import { formBuilder } from "../builder";
import type { FieldMap } from "../types/fields";
import type { KeyValueEntry } from "../types/registry";
import type { AnyRule } from "../types/rules";

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

interface ProjectCtx {
  defaultOwner: string;
}

const b = formBuilder<Project>().withFields(fields);
const bc = b.withContext<ProjectCtx>();

describe("rule inference", () => {
  test("the watch tuple is inferred as a literal tuple", () => {
    const rule = bc.rule({
      watch: ["visibility", "budget"],
      when: (visibility, budget) => visibility === "private" && budget > 0,
    });
    expectTypeOf(rule.watch).toEqualTypeOf<readonly ["visibility", "budget"]>();
  });

  test("when and apply parameters need no annotations", () => {
    bc.rule({
      watch: ["visibility"],
      when: (visibility) => {
        expectTypeOf(visibility).toEqualTypeOf<"private" | "public">();
        return visibility === "private";
      },
      apply: (form, ctx) => {
        expectTypeOf(ctx).toEqualTypeOf<ProjectCtx>();
        form.setValue("budget", 100);
        // @ts-expect-error — wrong value type
        form.setValue("budget", "100");
      },
    });
  });

  test("watch keys must be field names", () => {
    bc.rule({
      // @ts-expect-error — nope is not a field
      watch: ["nope"],
    });
  });
});

describe("context-free rules (no withContext)", () => {
  test("serve any form context", () => {
    const contextFree = b.rule({
      watch: ["budget"],
      when: (budget) => budget > 1000,
      apply: (form) => form.setVisible("memberRoles", true),
    });
    accepts<AnyRule<Project, ProjectCtx, Fields>>(contextFree);
    accepts<AnyRule<Project, { anything: number }, Fields>>(contextFree);
  });
});

describe("modules through the builder", () => {
  test("module checks selection and overrides", () => {
    bc.module({
      fields: ["name", "budget"],
      overrides: { name: { label: "Codename" } },
    });
    bc.module({
      // @ts-expect-error — not a field name
      fields: ["nope"],
    });
  });

  test("moduleFactory receives the context", () => {
    bc.moduleFactory((ctx) => {
      expectTypeOf(ctx).toEqualTypeOf<ProjectCtx>();
      return ctx.defaultOwner ? { fields: ["memberRoles"] } : null;
    });
  });
});
