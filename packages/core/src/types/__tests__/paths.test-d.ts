import { describe, expectTypeOf, test } from "vitest";
import type { DeepKeys, DeepValue } from "../paths";

interface Project {
  name: string;
  budget: number;
  archived: boolean;
  createdAt: Date;
  tags: string[];
  settings: {
    visibility: "private" | "public";
    limits: {
      maxTasks: number;
    };
  };
  owner?: {
    email: string;
  };
}

describe("DeepKeys", () => {
  test("lists top-level and nested object paths", () => {
    expectTypeOf<DeepKeys<Project>>().toEqualTypeOf<
      | "name"
      | "budget"
      | "archived"
      | "createdAt"
      | "tags"
      | "settings"
      | "settings.visibility"
      | "settings.limits"
      | "settings.limits.maxTasks"
      | "owner"
      | "owner.email"
    >();
  });

  test("treats arrays as leaves — no index or element paths", () => {
    expectTypeOf<"tags">().toExtend<DeepKeys<Project>>();
    // @ts-expect-error — array elements are not addressable
    expectTypeOf<"tags.0">().toExtend<DeepKeys<Project>>();
  });

  test("treats Date as a leaf — no method paths", () => {
    // @ts-expect-error — built-in object internals are not addressable
    expectTypeOf<"createdAt.getTime">().toExtend<DeepKeys<Project>>();
  });

  test("descends through optional objects", () => {
    expectTypeOf<"owner.email">().toExtend<DeepKeys<Project>>();
  });
});

describe("DeepValue", () => {
  test("resolves top-level paths", () => {
    expectTypeOf<DeepValue<Project, "budget">>().toEqualTypeOf<number>();
    expectTypeOf<DeepValue<Project, "tags">>().toEqualTypeOf<string[]>();
  });

  test("resolves nested paths, preserving literal types", () => {
    expectTypeOf<DeepValue<Project, "settings.visibility">>().toEqualTypeOf<
      "private" | "public"
    >();
    expectTypeOf<
      DeepValue<Project, "settings.limits.maxTasks">
    >().toEqualTypeOf<number>();
  });

  test("a path through an optional object keeps the leaf type", () => {
    expectTypeOf<DeepValue<Project, "owner.email">>().toEqualTypeOf<string>();
  });

  test("an optional leaf keeps its undefined", () => {
    expectTypeOf<DeepValue<Project, "owner">>().toEqualTypeOf<
      { email: string } | undefined
    >();
  });

  test("unknown paths resolve to never", () => {
    expectTypeOf<DeepValue<Project, "nope">>().toBeNever();
    expectTypeOf<DeepValue<Project, "settings.nope">>().toBeNever();
  });
});
