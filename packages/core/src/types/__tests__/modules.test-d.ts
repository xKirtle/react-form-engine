import { describe, test } from "vitest";
import type { FieldMap } from "../fields";
import type { FormModule, ModuleFactory } from "../modules";
import type { KeyValueEntry } from "../registry";
import type { Rule } from "../rules";

declare function accepts<T>(value: T): void;

interface Project {
  name: string;
  budget: number;
  currency: string;
  memberRoles: KeyValueEntry[];
  settings: {
    visibility: "private" | "public";
  };
}

const fields = {
  name: {
    key: "name",
    type: "text",
    label: "Project name",
  },
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

describe("field selection", () => {
  test("selects by field name", () => {
    accepts<FormModule<Project, BaseCtx, Fields>>({
      fields: ["name", "budget"],
    });
  });

  test("unknown names are rejected", () => {
    accepts<FormModule<Project, BaseCtx, Fields>>({
      // @ts-expect-error — not a field name
      fields: ["name", "nope"],
    });
  });
});

describe("overrides", () => {
  test("widen past the schema literal and follow the field's vocabulary", () => {
    accepts<FormModule<Project, BaseCtx, Fields>>({
      fields: ["name", "budget"],
      overrides: {
        // new label despite the schema's literal "Project name"
        name: { label: "Codename", validation: { maxLength: { value: 20 } } },
        budget: { validation: { min: { value: 0 } } },
      },
    });
  });

  test("keep the field's validation vocabulary", () => {
    accepts<FormModule<Project, BaseCtx, Fields>>({
      fields: ["budget"],
      overrides: {
        // @ts-expect-error — maxLength is not a number rule
        budget: { validation: { maxLength: { value: 3 } } },
      },
    });
  });

  test("cannot rebind identity", () => {
    accepts<FormModule<Project, BaseCtx, Fields>>({
      fields: ["name"],
      overrides: {
        // @ts-expect-error — key is not overridable
        name: { key: "budget" },
      },
    });
    accepts<FormModule<Project, BaseCtx, Fields>>({
      fields: ["name"],
      overrides: {
        // @ts-expect-error — type is not overridable
        name: { type: "number" },
      },
    });
  });
});

describe("defaults", () => {
  test("accept API paths beyond the field map, value-typed", () => {
    accepts<FormModule<Project, BaseCtx, Fields>>({
      fields: ["name"],
      defaults: {
        currency: "EUR",
        "settings.visibility": "private",
      },
    });
  });

  test("reject wrong values and unknown paths", () => {
    accepts<FormModule<Project, BaseCtx, Fields>>({
      fields: ["name"],
      defaults: {
        // @ts-expect-error — not a member of the union
        "settings.visibility": "internal",
      },
    });
    accepts<FormModule<Project, BaseCtx, Fields>>({
      fields: ["name"],
      defaults: {
        // @ts-expect-error — not an API path
        nope: "x",
      },
    });
  });
});

describe("rules in modules", () => {
  test("concrete rules erase into the module's rule list", () => {
    const rule = {} as Rule<Project, BaseCtx, Fields, readonly ["visibility"]>;
    accepts<FormModule<Project, BaseCtx, Fields>>({
      fields: ["visibility"],
      rules: [rule],
    });
  });
});

describe("module factories", () => {
  test("consult context and may opt out", () => {
    accepts<ModuleFactory<Project, CreateCtx, Fields>>((ctx) =>
      ctx.template === "internal" ? null : { fields: ["memberRoles"] },
    );
  });

  test("a base-context module serves a narrower-context form", () => {
    const baseModule = {} as FormModule<Project, BaseCtx, Fields>;
    accepts<FormModule<Project, CreateCtx, Fields>>(baseModule);

    const createModule = {} as FormModule<Project, CreateCtx, Fields>;
    // @ts-expect-error — a module needing CreateCtx cannot serve BaseCtx
    accepts<FormModule<Project, BaseCtx, Fields>>(createModule);
  });

  test("factories are contravariant in context too", () => {
    const baseFactory = {} as ModuleFactory<Project, BaseCtx, Fields>;
    accepts<ModuleFactory<Project, CreateCtx, Fields>>(baseFactory);
  });
});
