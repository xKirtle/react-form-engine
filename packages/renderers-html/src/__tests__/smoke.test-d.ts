import { expectTypeOf, test } from "vitest";

test("type-test pipeline is wired", () => {
  expectTypeOf({ key: "name" }).toEqualTypeOf<{ key: string }>();
});
