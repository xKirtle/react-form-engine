import type { AnyFormApi } from "@tanstack/react-form";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { OptionsStore, VisibilityStore } from "../runtime/engine";
import { createEngine, type FormEngineInternals } from "../runtime/engine";
import type { FieldTypeRuntime } from "../runtime/fieldTypes";
import { englishMessages, mergeMessages } from "../runtime/messages";
import { type ResolvedSchema, resolveModules } from "../runtime/resolver";
import { createRuleRunner, type RuleRunner } from "../runtime/ruleRunner";
import {
  createValidationController,
  type ValidationController,
} from "../runtime/validationState";
import type { FormEngineApi } from "../types/engine";
import type { FieldMap } from "../types/fields";
import type { EngineMessages, EngineMessagesOverride } from "../types/messages";
import type { ModuleInput } from "../types/modules";

/** @group Hooks */
export interface UseFormEngineOptions<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
> {
  fields: TFields;
  modules?: readonly ModuleInput<TApi, TContext, TFields>[];
  context: TContext;
  /** API-model values to parse at init. */
  initialValues?: Partial<TApi>;
  initialErrors?: "eager" | "gated";
  hiddenValues?: "omit" | "null";
  messages?: EngineMessagesOverride;
  /** Runtimes for custom field types. */
  fieldTypes?: Record<string, FieldTypeRuntime>;
  /** Omit for submit-less forms. Receives the serialized API model. */
  onSubmit?: (apiValues: TApi) => void | Promise<void>;
}

/** @group Hooks */
export interface UseFormEngineReturn<
  TApi,
  TContext,
  TFields extends FieldMap<TApi>,
> {
  /** The underlying TanStack form — the escape hatch below rung 2. */
  form: AnyFormApi;
  /** The imperative engine API (rung 2), user channel. */
  engine: FormEngineApi<TApi, TFields>;
  /** The resolved schema — current after context changes. */
  schema: ResolvedSchema<TApi, TContext, TFields>;
  validation: ValidationController<TApi, TContext, TFields>;
  visibility: VisibilityStore;
  options: OptionsStore;
  messages: EngineMessages;
  /** Reactive: true only for user-channel edits. */
  isDirty: boolean;
  /** markSubmitted → validate → gate → serialize → onSubmit. */
  handleSubmit(): Promise<void>;
  /** The current values as the API model (hidden-field policy applied). */
  serialize(): TApi;
  /** Re-parse, re-run rules, clear dirty and display state. */
  reset(apiValues?: Partial<TApi>): void;
  /** Engine internals for the rendering layer. Not a stable consumer API. */
  internals: FormEngineInternals<TApi, TContext, TFields>;
}

/**
 * The form lifecycle in one hook: resolves modules against the field map,
 * parses initial values, runs rules, validates, and serializes on submit.
 *
 * Instance-lifetime contract: the engine, rule runner, and validation
 * controller live as long as the hook instance. When the context's
 * *identity* changes, modules re-resolve and the schema is swapped in
 * place — display state (touched, submitted, server errors) survives.
 * Only `reset()` clears it.
 *
 * @group Hooks
 */
export function useFormEngine<TApi, TContext, TFields extends FieldMap<TApi>>(
  options: UseFormEngineOptions<TApi, TContext, TFields>,
): UseFormEngineReturn<TApi, TContext, TFields> {
  const contextRef = useRef(options.context);
  contextRef.current = options.context;
  const onSubmitRef = useRef(options.onSubmit);
  onSubmitRef.current = options.onSubmit;

  const [stable] = useState(() => {
    const schema = resolveModules<TApi, TContext, TFields>({
      fields: options.fields,
      modules: options.modules ?? [],
      context: options.context,
    });
    const internals = createEngine<TApi, TContext, TFields>({
      schema,
      apiValues: options.initialValues,
      fieldTypes: options.fieldTypes,
      hiddenValues: options.hiddenValues,
    });
    const messages = mergeMessages(englishMessages, options.messages);
    const runner: RuleRunner = createRuleRunner({
      internals,
      getContext: () => contextRef.current,
    });
    const validation = createValidationController({
      internals,
      initialErrors: options.initialErrors,
      messages,
    });
    return {
      internals,
      runner,
      validation,
      messages,
      fields: options.fields,
      modules: options.modules ?? [],
      resolvedContext: options.context,
    };
  });

  // Lifecycle: mount the form, run the initial rule pass, then start
  // validation — the controller snapshots init-origin errors *after*
  // rules have seeded, so rule-written values count as initial data.
  useEffect(() => {
    const unmount = stable.internals.mount();
    const stopRunner = stable.runner.start();
    const stopValidation = stable.validation.start();
    return () => {
      stopValidation();
      stopRunner();
      unmount();
    };
  }, [stable]);

  // Context identity change: re-resolve and swap the schema in place.
  useEffect(() => {
    if (Object.is(stable.resolvedContext, options.context)) {
      return;
    }
    stable.resolvedContext = options.context;
    const schema = resolveModules<TApi, TContext, TFields>({
      fields: stable.fields,
      modules: stable.modules,
      context: options.context,
    });
    stable.internals.updateSchema(schema);
    stable.validation.updateSchema(schema);
    stable.runner.run();
  }, [stable, options.context]);

  const isDirty = useSyncExternalStore(
    (listener) => {
      const subscription = stable.internals.form.store.subscribe(listener);
      return typeof subscription === "function"
        ? subscription
        : () => (subscription as { unsubscribe: () => void }).unsubscribe();
    },
    () => stable.internals.isDirty(),
    () => false,
  );

  return useMemo(
    () => ({
      form: stable.internals.form,
      engine: stable.internals.engine,
      get schema() {
        return stable.internals.schema;
      },
      validation: stable.validation,
      visibility: stable.internals.visibility,
      options: stable.internals.options,
      messages: stable.messages,
      isDirty,
      async handleSubmit() {
        stable.validation.markSubmitted();
        if (!stable.validation.isValid()) {
          return;
        }
        await onSubmitRef.current?.(stable.internals.serialize() as TApi);
      },
      serialize: () => stable.internals.serialize() as TApi,
      reset(apiValues?: Partial<TApi>) {
        stable.internals.engine.reset(apiValues);
        stable.runner.restart();
        stable.validation.reset();
      },
      internals: stable.internals,
    }),
    [stable, isDirty],
  );
}
