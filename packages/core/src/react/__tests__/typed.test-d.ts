import { describe, expectTypeOf, test } from "vitest";
import type { FieldMap } from "../../types/fields";
import type { FormValueOf } from "../../types/values";
import { formComponentsFor } from "../typed";
import type { UseFormEngineReturn } from "../useFormEngine";
import { useFormValue } from "../useFormValue";

interface Project {
  name: string;
  budget: number;
}

const fields = {
  name: { key: "name", type: "text" },
  budget: { key: "budget", type: "number" },
} as const satisfies FieldMap<Project>;

declare const bundle: UseFormEngineReturn<Project, undefined, typeof fields>;

describe("formComponentsFor", () => {
  const { Field, AutoFields } = formComponentsFor(bundle);

  test("name and except are compile-checked", () => {
    Field({ name: "name" });
    // @ts-expect-error — not a field name
    Field({ name: "nope" });

    AutoFields({ except: ["budget"] });
    // @ts-expect-error — not a field name
    AutoFields({ except: ["nope"] });
  });
});

describe("useFormValue typing", () => {
  test("returns the field's form value type", () => {
    expectTypeOf(useFormValue(bundle, "budget")).toEqualTypeOf<number>();
    expectTypeOf(useFormValue(bundle, "name")).toEqualTypeOf<string>();
    expectTypeOf<
      Parameters<typeof useFormValue<Project, undefined, typeof fields, never>>
    >();
    // @ts-expect-error — not a field name
    useFormValue(bundle, "nope");
  });

  test("agrees with FormValueOf", () => {
    expectTypeOf(useFormValue(bundle, "budget")).toEqualTypeOf<
      FormValueOf<Project, (typeof fields)["budget"]>
    >();
  });
});
