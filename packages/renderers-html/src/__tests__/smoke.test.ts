import * as core from "@react-form-engine/core";
import { describe, expect, it } from "vitest";
import * as renderers from "../index";

describe("package entry", () => {
  it("loads", () => {
    expect(renderers).toBeDefined();
  });

  it("resolves the core workspace dependency", () => {
    expect(core).toBeDefined();
  });
});
