import type { FieldMap } from "./types/fields";
import type { FormModule, ModuleFactory } from "./types/modules";
import type { Rule } from "./types/rules";

/**
 * A builder bound to an API model, a field map, and (optionally, via
 * `withContext`) a context type. Its methods are typed pass-throughs:
 * they return their argument unchanged and exist so rules and modules
 * infer completely from the call site — watch tuples, `when`/`apply`
 * parameters, overrides — with no type annotations.
 *
 * @group Builder
 */
export interface BoundFormBuilder<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
> {
  /**
   * Narrows the builder to a context type. Rules and factories made after
   * this see the context; rules made without it are context-free and serve
   * any form whose context extends theirs.
   */
  withContext<TNewContext>(): BoundFormBuilder<TApi, TNewContext, TFields>;

  rule<const W extends readonly (keyof TFields & string)[]>(
    rule: Rule<TApi, TContext, TFields, W>,
  ): Rule<TApi, TContext, TFields, W>;

  module(
    module: FormModule<TApi, TContext, TFields>,
  ): FormModule<TApi, TContext, TFields>;

  moduleFactory(
    factory: ModuleFactory<TApi, TContext, TFields>,
  ): ModuleFactory<TApi, TContext, TFields>;
}

/**
 * The entry point returned by {@link formBuilder}.
 *
 * @group Builder
 */
export interface FormBuilder<TApi> {
  withFields<TFields extends FieldMap<TApi>>(
    fields: TFields,
  ): BoundFormBuilder<TApi, unknown, TFields>;
}

function boundFormBuilder<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
>(): BoundFormBuilder<TApi, TContext, TFields> {
  return {
    withContext: () => boundFormBuilder(),
    rule: (rule) => rule,
    module: (module) => module,
    moduleFactory: (factory) => factory,
  };
}

/**
 * The single inference anchor: bind the API model once, then the field
 * map, and everything downstream — rules, modules, factories — infers
 * with no annotations.
 *
 * @example
 * ```ts
 * const b = formBuilder<Project>().withFields(projectFields);
 *
 * // context-free: serves any form over these fields
 * const requireBudgetWhenFunded = b.rule({
 *   watch: ["kind"],
 *   when: (kind) => kind === "funded", // kind is typed from the map
 *   apply: (form) => form.setVisible("budget", true),
 *   otherwise: (form) => form.setVisible("budget", false),
 * });
 *
 * // context-aware: rules and factories made here see ProjectFormCtx
 * const bc = b.withContext<ProjectFormCtx>();
 * const basics = bc.module({
 *   fields: ["name", "kind", "budget"],
 *   rules: [requireBudgetWhenFunded],
 * });
 * ```
 *
 * @group Builder
 */
export function formBuilder<TApi>(): FormBuilder<TApi> {
  return {
    withFields: () => boundFormBuilder(),
  };
}
