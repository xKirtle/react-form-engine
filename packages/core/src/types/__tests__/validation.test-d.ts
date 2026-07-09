import { describe, expectTypeOf, test } from "vitest";
import type {
  FieldTypeSpec,
  FieldValidationOf,
  KeyValueEntry,
} from "../registry";
import type { StandardSchemaV1 } from "../standardSchema";

// Vocabulary membership is enforced through excess property checking, which
// only fires on fresh object literals — so rejection tests assign literals
// via this helper instead of using expectTypeOf().toExtend().
declare function accepts<T>(value: T): void;

// A consumer type with no explicit validation slot: inherits the vocabulary
// derived from its value domain (number).
declare module "../registry" {
  interface FieldTypeRegistry {
    slider: FieldTypeSpec<number, { step: number }>;
  }
}

describe("string vocabulary (text)", () => {
  test("accepts the full string rule set", () => {
    accepts<FieldValidationOf<"text">>({
      required: true,
      minLength: { value: 2 },
      maxLength: { value: 60, message: "Too long" },
      pattern: { value: /^\w+$/ },
    });
  });

  test("rejects rules from other domains", () => {
    // @ts-expect-error — min is a number rule
    accepts<FieldValidationOf<"text">>({ min: { value: 5 } });
  });
});

describe("number vocabulary", () => {
  test("accepts min/max", () => {
    accepts<FieldValidationOf<"number">>({
      min: { value: 0 },
      max: { value: 100, message: "Too large" },
    });
  });

  test("rejects string rules", () => {
    // @ts-expect-error — maxLength is a string rule
    accepts<FieldValidationOf<"number">>({ maxLength: { value: 3 } });
  });

  test("custom receives the value domain", () => {
    expectTypeOf<NonNullable<FieldValidationOf<"number">["custom"]>>()
      .parameter(0)
      .toEqualTypeOf<number>();
  });
});

describe("select vocabulary", () => {
  test("is the base set only — no free-text rules", () => {
    accepts<FieldValidationOf<"select">>({ required: true });
    // @ts-expect-error — pattern makes no sense on a closed option set
    accepts<FieldValidationOf<"select">>({ pattern: { value: /x/ } });
  });
});

describe("date vocabulary", () => {
  test("min/max are ISO date strings", () => {
    accepts<FieldValidationOf<"date">>({
      min: { value: "2026-01-01" },
      max: { value: "2026-12-31", message: "Within 2026" },
    });
    // @ts-expect-error — date bounds are ISO strings, not numbers
    accepts<FieldValidationOf<"date">>({ min: { value: 5 } });
  });
});

describe("checkbox vocabulary", () => {
  test("is the base set only", () => {
    accepts<FieldValidationOf<"checkbox">>({ required: true });
    // @ts-expect-error — no numeric rules on a boolean
    accepts<FieldValidationOf<"checkbox">>({ min: { value: 1 } });
  });
});

describe("list vocabularies", () => {
  test("stringList accepts item-count rules", () => {
    accepts<FieldValidationOf<"stringList">>({
      minItems: { value: 1 },
      maxItems: { value: 10, message: "Too many" },
    });
  });

  test("custom receives the list value", () => {
    expectTypeOf<NonNullable<FieldValidationOf<"stringList">["custom"]>>()
      .parameter(0)
      .toEqualTypeOf<string[]>();
    expectTypeOf<NonNullable<FieldValidationOf<"keyValueList">["custom"]>>()
      .parameter(0)
      .toEqualTypeOf<KeyValueEntry[]>();
  });
});

describe("universal members", () => {
  test("schema slot takes a Standard Schema over the value domain", () => {
    accepts<FieldValidationOf<"text">>({
      schema: {} as StandardSchemaV1<string>,
    });
    // a schema with narrower input (e.g. a literal union) is accepted
    accepts<FieldValidationOf<"select">>({
      schema: {} as StandardSchemaV1<"low" | "high">,
    });
  });

  test("required allows a per-field message", () => {
    accepts<FieldValidationOf<"text">>({
      required: { message: "Name is mandatory" },
    });
  });

  test("custom returns a message or nullish", () => {
    accepts<FieldValidationOf<"text">>({
      custom: (value) => (value.startsWith("x") ? "No x names" : null),
    });
  });
});

describe("custom field types", () => {
  test("inherit the vocabulary of their value domain", () => {
    accepts<FieldValidationOf<"slider">>({
      min: { value: 0 },
      max: { value: 11 },
    });
    // @ts-expect-error — string rules don't apply to a number domain
    accepts<FieldValidationOf<"slider">>({ maxLength: { value: 2 } });
  });
});
