import type { FormEngineApi } from "./engine";
import type { FieldMap } from "./fields";
import type { FormValueOf } from "./values";

/**
 * A watch tuple's form values, positionally.
 *
 * @group Rules
 */
export type WatchedValues<
  TApi,
  TFields extends FieldMap<TApi>,
  W extends readonly (keyof TFields & string)[],
> = {
  -readonly [I in keyof W]: FormValueOf<TApi, TFields[W[I]]>;
};

/**
 * A typed rule — rung 1 of the knob ladder. Runs after parse and whenever
 * a watched value changes: `apply` when `when` returns true (or is absent),
 * `otherwise` on the transition to false. Both receive the engine API
 * scoped so their writes never dirty the form, plus the form's context.
 *
 * `TContext` is contravariant (`in`): a rule written against a base
 * context — or none — serves any form whose context extends it, so form
 * variants share one rule set.
 *
 * @group Rules
 */
export interface Rule<
  TApi,
  in TContext,
  TFields extends FieldMap<TApi>,
  W extends readonly (keyof TFields & string)[],
> {
  watch: W;
  when?: (...values: WatchedValues<TApi, TFields, W>) => boolean;
  apply?: (form: FormEngineApi<TApi, TFields>, context: TContext) => void;
  otherwise?: (form: FormEngineApi<TApi, TFields>, context: TContext) => void;
}

/**
 * The storage form of a rule, with the watch tuple erased — what modules
 * and the resolver traffic in. Any concrete {@link Rule} is assignable to
 * it; the runtime re-derives watched values by name.
 *
 * @group Rules
 */
export interface AnyRule<TApi, in TContext, TFields extends FieldMap<TApi>> {
  watch: readonly (keyof TFields & string)[];
  when?: (...values: never[]) => boolean;
  apply?: (form: FormEngineApi<TApi, TFields>, context: TContext) => void;
  otherwise?: (form: FormEngineApi<TApi, TFields>, context: TContext) => void;
}
