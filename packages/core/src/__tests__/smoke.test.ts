import { describe, expect, it } from "vitest";
import * as core from "../index";

describe("package entry", () => {
  it("loads", () => {
    expect(core).toBeDefined();
  });
});
