import type { FieldDefinition, FieldMap } from "../types/fields";
import type { ApiDefaults, FormModule, ModuleInput } from "../types/modules";
import type { AnyRule } from "../types/rules";

/**
 * The flattened result of applying modules to a field map for one context:
 * what a form instance actually has. `fields` iterates in first-appearance
 * order — the order AutoFields renders.
 */
export interface ResolvedSchema<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
> {
  fields: Map<keyof TFields & string, FieldDefinition<TApi>>;
  rules: readonly AnyRule<TApi, TContext, TFields>[];
  defaults: ApiDefaults<TApi>;
}

/**
 * Resolves modules against a field map. Factories run exactly once, with
 * the context; `null` returns opt out. Inclusion order is first-appearance;
 * property merges are last-wins: later overrides and later defaults win
 * over earlier ones.
 *
 * Overrides merge shallowly (an overridden `validation` replaces the
 * definition's as a unit) and apply to any resolved field no matter which
 * module included it; overrides for fields the resolution never includes
 * are ignored. Unknown names — in selections or override targets — throw.
 */
export function resolveModules<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
>(options: {
  fields: TFields;
  modules: readonly ModuleInput<TApi, TContext, TFields>[];
  context: TContext;
}): ResolvedSchema<TApi, TContext, TFields> {
  const modules = materializeModules(options.modules, options.context);
  const fields = includeFields(options.fields, modules);
  applyOverrides(fields, options.fields, modules);

  return {
    fields,
    rules: modules.flatMap((module) => module.rules ?? []),
    defaults: mergeDefaults(modules),
  };
}

/** Runs factories with the context and drops opted-out (`null`) modules. */
function materializeModules<TApi, TContext, TFields extends FieldMap<TApi>>(
  modules: readonly ModuleInput<TApi, TContext, TFields>[],
  context: TContext,
): FormModule<TApi, TContext, TFields>[] {
  const materialized: FormModule<TApi, TContext, TFields>[] = [];
  for (const input of modules) {
    const module = typeof input === "function" ? input(context) : input;
    if (module !== null) {
      materialized.push(module);
    }
  }
  return materialized;
}

/** Collects selected definitions from the map, first appearance wins. */
function includeFields<TApi, TContext, TFields extends FieldMap<TApi>>(
  fields: TFields,
  modules: readonly FormModule<TApi, TContext, TFields>[],
): Map<keyof TFields & string, FieldDefinition<TApi>> {
  const included = new Map<keyof TFields & string, FieldDefinition<TApi>>();
  for (const module of modules) {
    for (const name of module.fields) {
      const definition = fields[name];
      if (definition === undefined) {
        throw new Error(`Module references unknown field "${name}".`);
      }
      if (!included.has(name)) {
        included.set(name, definition);
      }
    }
  }
  return included;
}

/** Merges overrides onto included definitions, in module order. */
function applyOverrides<TApi, TContext, TFields extends FieldMap<TApi>>(
  included: Map<keyof TFields & string, FieldDefinition<TApi>>,
  fields: TFields,
  modules: readonly FormModule<TApi, TContext, TFields>[],
): void {
  for (const module of modules) {
    if (module.overrides === undefined) {
      continue;
    }
    for (const [name, override] of Object.entries(module.overrides)) {
      if (fields[name] === undefined) {
        throw new Error(`Override targets unknown field "${name}".`);
      }
      const current = included.get(name as keyof TFields & string);
      if (override === undefined || current === undefined) {
        continue;
      }
      // A shallow spread of definition + override preserves the definition
      // shape, but the compiler cannot relate a spread of the union type.
      included.set(
        name as keyof TFields & string,
        { ...current, ...override } as FieldDefinition<TApi>,
      );
    }
  }
}

/** Merges module defaults, later modules win. */
function mergeDefaults<TApi, TContext, TFields extends FieldMap<TApi>>(
  modules: readonly FormModule<TApi, TContext, TFields>[],
): ApiDefaults<TApi> {
  const defaults: ApiDefaults<TApi> = {};
  for (const module of modules) {
    if (module.defaults !== undefined) {
      Object.assign(defaults, module.defaults);
    }
  }
  return defaults;
}
