import type { FieldDefinitionFor, FieldMap } from "./fields";
import type { DeepKeys, DeepValue } from "./paths";
import type { FieldTypeName } from "./registry";
import type { AnyRule } from "./rules";

/**
 * A per-field override inside a module: any definition slot except the
 * identity pair (`key`, `type` — rebinding those would silently change what
 * the field is). Typed against the field's wide definition shape, not the
 * schema literal, so overriding a label is not constrained to the original
 * string.
 *
 * @group Modules
 */
export type FieldOverride<TApi, F> = F extends {
  key: infer K extends DeepKeys<TApi>;
  type: infer T extends FieldTypeName;
}
  ? Omit<Partial<FieldDefinitionFor<TApi, K, T>>, "key" | "type">
  : never;

/**
 * API-model values by path — what a module's `defaults` contribute.
 *
 * @group Modules
 */
export type ApiDefaults<TApi> = {
  [K in DeepKeys<TApi>]?: DeepValue<TApi, K>;
};

/**
 * A reusable slice of a form: which fields it brings, per-field overrides
 * (merged shallowly onto the definition, override wins per property), the
 * rules that come with it, and API-model defaults.
 *
 * When several modules bring the same field, the first definition wins and
 * later overrides merge onto it. `defaults` contribute values at parse and
 * serialize even for keys with no field definition at all — a module can
 * guarantee a submitted value without rendering anything.
 *
 * `TContext` is contravariant, like rules: a base-context module serves any
 * form whose context extends it.
 *
 * @group Modules
 */
export interface FormModule<TApi, in TContext, TFields extends FieldMap<TApi>> {
  fields: readonly (keyof TFields & string)[];
  overrides?: { [N in keyof TFields]?: FieldOverride<TApi, TFields[N]> };
  rules?: readonly AnyRule<TApi, TContext, TFields>[];
  defaults?: ApiDefaults<TApi>;
}

/**
 * A context-driven module: resolved once per (modules, context) resolution.
 * Returning `null` opts the module out entirely for this form instance.
 *
 * @group Modules
 */
export type ModuleFactory<TApi, TContext, TFields extends FieldMap<TApi>> = (
  context: TContext,
) => FormModule<TApi, TContext, TFields> | null;

/**
 * What a form's `modules` list accepts: static modules and factories.
 *
 * @group Modules
 */
export type ModuleInput<TApi, TContext, TFields extends FieldMap<TApi>> =
  | FormModule<TApi, TContext, TFields>
  | ModuleFactory<TApi, TContext, TFields>;
