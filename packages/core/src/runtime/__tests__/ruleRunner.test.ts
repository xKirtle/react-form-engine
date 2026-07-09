import { describe, expect, it } from "vitest";
import { formBuilder } from "../../builder";
import type { FieldMap } from "../../types/fields";
import type { ModuleInput } from "../../types/modules";
import { createEngine } from "../engine";
import { resolveModules } from "../resolver";
import { createRuleRunner } from "../ruleRunner";

interface Project {
  kind: string;
  budget: number;
  summary: string;
  memberRoles: { key: string; value: string }[];
}

const fields = {
  kind: { key: "kind", type: "select" },
  budget: { key: "budget", type: "number" },
  summary: { key: "summary", type: "text" },
  memberRoles: { key: "memberRoles", type: "keyValueList" },
} as const satisfies FieldMap<Project>;

interface Ctx {
  defaultOwner: string;
}

const b = formBuilder<Project>().withFields(fields).withContext<Ctx>();

function setup(
  rules: ModuleInput<Project, Ctx, typeof fields>[],
  apiValues: Partial<Project> = {},
) {
  const schema = resolveModules<Project, Ctx, typeof fields>({
    fields,
    modules: rules,
    context: { defaultOwner: "alice" },
  });
  const internals = createEngine({ schema, apiValues });
  const runner = createRuleRunner({
    internals,
    context: { defaultOwner: "alice" },
  });
  return { internals, runner };
}

const allFields = ["kind", "budget", "summary", "memberRoles"] as const;

describe("initial pass", () => {
  it("applies rules whose condition holds at init", () => {
    const seedOwner = b.rule({
      watch: ["kind"],
      when: (kind) => kind === "delegated",
      apply: (form, ctx) => {
        form.ensureRows("memberRoles", [
          {
            match: { key: "owner" },
            value: { key: "owner", value: ctx.defaultOwner },
            meta: { pinned: true },
          },
        ]);
      },
    });
    const { internals, runner } = setup(
      [{ fields: [...allFields], rules: [seedOwner] }],
      { kind: "delegated" },
    );
    runner.start();
    const rows = internals.engine.getValue("memberRoles");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.meta.pinned).toBe(true);
    expect(internals.isDirty()).toBe(false);
  });

  it("runs otherwise at init when the condition is false", () => {
    const hideBudget = b.rule({
      watch: ["kind"],
      when: (kind) => kind === "funded",
      apply: (form) => form.setVisible("budget", true),
      otherwise: (form) => form.setVisible("budget", false),
    });
    const { internals, runner } = setup([
      { fields: [...allFields], rules: [hideBudget] },
    ]);
    runner.start();
    expect(internals.engine.isVisible("budget")).toBe(false);
  });
});

describe("watch-diff evaluation", () => {
  it("re-evaluates only when a watched value changes", () => {
    let evaluations = 0;
    const counting = b.rule({
      watch: ["kind"],
      when: () => {
        evaluations += 1;
        return false;
      },
    });
    const { internals, runner } = setup([
      { fields: [...allFields], rules: [counting] },
    ]);
    runner.start();
    expect(evaluations).toBe(1); // initial pass

    internals.engine.setValue("summary", "unrelated");
    expect(evaluations).toBe(1);

    internals.engine.setValue("kind", "funded");
    expect(evaluations).toBe(2);
  });

  it("apply re-runs on every change while the condition holds", () => {
    const derive = b.rule({
      watch: ["budget"],
      when: (budget) => budget > 0,
      apply: (form) => {
        form.setValue("summary", `Budget: ${form.getValue("budget")}`);
      },
    });
    const { internals, runner } = setup([
      { fields: [...allFields], rules: [derive] },
    ]);
    runner.start();

    internals.engine.setValue("budget", 100);
    expect(internals.engine.getValue("summary")).toBe("Budget: 100");
    internals.engine.setValue("budget", 250);
    expect(internals.engine.getValue("summary")).toBe("Budget: 250");
  });

  it("otherwise runs on the transition to false, once", () => {
    let released = 0;
    const transition = b.rule({
      watch: ["kind"],
      when: (kind) => kind === "delegated",
      otherwise: () => {
        released += 1;
      },
    });
    const { internals, runner } = setup(
      [{ fields: [...allFields], rules: [transition] }],
      { kind: "delegated" },
    );
    runner.start();
    expect(released).toBe(0);

    internals.engine.setValue("kind", "simple");
    expect(released).toBe(1);
    internals.engine.setValue("kind", "basic"); // still false — no re-release
    expect(released).toBe(1);
    internals.engine.setValue("kind", "delegated");
    internals.engine.setValue("kind", "simple"); // false again — releases again
    expect(released).toBe(2);
  });
});

describe("cascades", () => {
  it("chained rules settle: A writes what B watches", () => {
    const first = b.rule({
      watch: ["budget"],
      apply: (form) =>
        form.setValue(
          "kind",
          form.getValue("budget") > 1000 ? "funded" : "simple",
        ),
    });
    const second = b.rule({
      watch: ["kind"],
      apply: (form) =>
        form.setValue("summary", `Kind: ${form.getValue("kind")}`),
    });
    const { internals, runner } = setup([
      { fields: [...allFields], rules: [first, second] },
    ]);
    runner.start();

    internals.engine.setValue("budget", 5000);
    expect(internals.engine.getValue("summary")).toBe("Kind: funded");
  });

  it("a rule rewriting its own watched field to a new value is stopped", () => {
    const runaway = b.rule({
      watch: ["budget"],
      apply: (form) => form.setValue("budget", form.getValue("budget") + 1),
    });
    const { runner } = setup(
      [{ fields: [...allFields], rules: [runaway] }],
      { budget: 1 }, // a real number — from NaN the increment is a no-op
    );
    expect(() => runner.start()).toThrowError(/did not settle/);
  });

  it("a rule rewriting its own watched field to the same value settles", () => {
    const idempotent = b.rule({
      watch: ["summary"],
      apply: (form) => form.setValue("summary", form.getValue("summary")),
    });
    const { runner } = setup([{ fields: [...allFields], rules: [idempotent] }]);
    expect(() => runner.start()).not.toThrow();
  });
});

describe("lifecycle", () => {
  it("stop unsubscribes from the store", () => {
    let evaluations = 0;
    const counting = b.rule({
      watch: ["kind"],
      when: () => {
        evaluations += 1;
        return false;
      },
    });
    const { internals, runner } = setup([
      { fields: [...allFields], rules: [counting] },
    ]);
    const stop = runner.start();
    stop();
    internals.engine.setValue("kind", "funded");
    expect(evaluations).toBe(1);
  });

  it("restart clears rule memory and re-runs the initial pass", () => {
    let released = 0;
    const transition = b.rule({
      watch: ["kind"],
      when: (kind) => kind === "delegated",
      otherwise: () => {
        released += 1;
      },
    });
    const { runner } = setup([{ fields: [...allFields], rules: [transition] }]);
    runner.start();
    expect(released).toBe(1); // init: condition false

    runner.restart();
    expect(released).toBe(2); // fresh memory: init transition again
  });
});
