import { describe, expectTypeOf, test } from "vitest";
import type {
  FieldConfigOf,
  FieldTypeName,
  FieldTypeSpec,
  FieldValueOf,
  KeyValueEntry,
  SelectItem,
} from "../registry";

// Simulates a consumer registering a custom field type. Module augmentation
// is program-wide, so tests below must not assert exact unions over the
// registry's keys.
declare module "../registry" {
  interface FieldTypeRegistry {
    rating: FieldTypeSpec<number, { max: number }>;
  }
}

describe("built-in value domains", () => {
  test("scalar types", () => {
    expectTypeOf<FieldValueOf<"text">>().toEqualTypeOf<string>();
    expectTypeOf<FieldValueOf<"number">>().toEqualTypeOf<number>();
    expectTypeOf<FieldValueOf<"date">>().toEqualTypeOf<string>();
    expectTypeOf<FieldValueOf<"checkbox">>().toEqualTypeOf<boolean>();
    expectTypeOf<FieldValueOf<"select">>().toEqualTypeOf<string>();
  });

  test("list types", () => {
    expectTypeOf<FieldValueOf<"stringList">>().toEqualTypeOf<string[]>();
    expectTypeOf<FieldValueOf<"keyValueList">>().toEqualTypeOf<
      KeyValueEntry[]
    >();
  });
});

describe("built-in config domains", () => {
  test("select carries items", () => {
    expectTypeOf<FieldConfigOf<"select">>().toEqualTypeOf<{
      items?: readonly SelectItem[];
    }>();
  });

  test("types without config resolve to undefined", () => {
    expectTypeOf<FieldConfigOf<"text">>().toEqualTypeOf<undefined>();
  });
});

describe("registry extension", () => {
  test("an augmented type is a first-class citizen", () => {
    expectTypeOf<"rating">().toExtend<FieldTypeName>();
    expectTypeOf<FieldValueOf<"rating">>().toEqualTypeOf<number>();
    expectTypeOf<FieldConfigOf<"rating">>().toEqualTypeOf<{ max: number }>();
  });

  test("unregistered names are rejected", () => {
    // @ts-expect-error — not a registered field type
    expectTypeOf<"unregistered">().toExtend<FieldTypeName>();
  });
});
