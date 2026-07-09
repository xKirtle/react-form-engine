import type { FieldMap } from "../types/fields";
import type { AnyRule } from "../types/rules";
import type { FormEngineInternals } from "./engine";

/**
 * How many settle passes a single evaluation may take before the runner
 * assumes a rule keeps rewriting its own watched fields and aborts.
 */
const MAX_CASCADE_PASSES = 25;

export interface RuleRunner {
  /** Runs the initial pass and subscribes to the form store. Returns stop. */
  start(): () => void;
  /** Clears rule memory and re-runs the initial pass (after a reset). */
  restart(): void;
  /** Evaluates now — e.g. after a schema update added rules. */
  run(): void;
}

/**
 * Evaluates rules against the form store. A rule is (re)considered when its
 * watched tuple changed since last seen (`Object.is` per element). `apply`
 * runs on every such change while the condition holds; `otherwise` runs on
 * the transition to false. The initial pass counts as a transition in both
 * directions, so e.g. visibility rules take effect at init.
 *
 * Rule writes go through the engine's rule scope (derived channel), and the
 * store updates they cause are folded into the same evaluation: the runner
 * loops until a pass fires no callback. Same-value writes short-circuit in
 * the engine, so idempotent rules settle immediately.
 */
export function createRuleRunner<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
>(options: {
  internals: FormEngineInternals<TApi, TContext, TFields>;
  /** Read per evaluation, so a re-resolved form's context stays current. */
  getContext: () => TContext;
}): RuleRunner {
  const { internals, getContext } = options;

  type StoredRule = AnyRule<TApi, TContext, TFields>;
  const lastSeen = new Map<StoredRule, readonly unknown[]>();
  const lastCondition = new Map<StoredRule, boolean>();
  let running = false;

  function evaluate(): void {
    if (running) {
      // Store updates caused by rule writes land here; the running pass
      // picks them up through its own re-diffing loop.
      return;
    }
    running = true;
    try {
      let passes = 0;
      let fired = true;
      while (fired) {
        passes += 1;
        if (passes > MAX_CASCADE_PASSES) {
          throw new Error(
            `Rules did not settle after ${MAX_CASCADE_PASSES} passes — ` +
              "look for a rule that keeps rewriting a field it watches.",
          );
        }
        fired = false;
        // read live: a schema update may have changed the rule list
        for (const rule of internals.schema.rules) {
          if (evaluateRule(rule)) {
            fired = true;
          }
        }
      }
    } finally {
      running = false;
    }
  }

  /** Returns true when a callback ran (the store may have changed). */
  function evaluateRule(rule: StoredRule): boolean {
    const values = rule.watch.map(
      (name) => internals.form.getFieldValue(name as never) as unknown,
    );
    const seen = lastSeen.get(rule);
    if (seen !== undefined && sameTuple(seen, values)) {
      return false;
    }
    lastSeen.set(rule, values);

    const condition =
      rule.when === undefined
        ? true
        : (rule.when as (...args: unknown[]) => boolean)(...values);
    const previous = lastCondition.get(rule);
    lastCondition.set(rule, condition);

    if (condition) {
      if (rule.apply !== undefined) {
        rule.apply(internals.ruleScope, getContext());
        return true;
      }
      return false;
    }
    if (previous !== false && rule.otherwise !== undefined) {
      rule.otherwise(internals.ruleScope, getContext());
      return true;
    }
    return false;
  }

  function start(): () => void {
    evaluate();
    return subscribeToStore(internals, evaluate);
  }

  function restart(): void {
    lastSeen.clear();
    lastCondition.clear();
    evaluate();
  }

  return { start, restart, run: evaluate };
}

function sameTuple(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
}

function subscribeToStore(
  internals: {
    form: { store: { subscribe: (listener: () => void) => unknown } };
  },
  listener: () => void,
): () => void {
  const subscription = internals.form.store.subscribe(listener);
  if (typeof subscription === "function") {
    return subscription as () => void;
  }
  return () => {
    (subscription as { unsubscribe: () => void }).unsubscribe();
  };
}
