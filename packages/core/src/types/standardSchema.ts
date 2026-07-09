/**
 * The Standard Schema v1 interface (https://standardschema.dev), vendored as
 * the spec intends — it exists so libraries can interoperate with any
 * compliant validator (Zod, Valibot, ArkType, ...) without depending on one.
 *
 * The engine accepts these in a field's `validation.schema` slot. Note that
 * the engine's validity pass is synchronous: a validator that returns a
 * Promise is reported as a runtime error pointing at the external-error
 * channel (`setServerError`).
 *
 * @group Validation
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": StandardSchemaProps<Input, Output>;
}

/** @group Validation */
export interface StandardSchemaProps<Input, Output> {
  readonly version: 1;
  readonly vendor: string;
  readonly validate: (
    value: unknown,
  ) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
  readonly types?: {
    readonly input: Input;
    readonly output: Output;
  };
}

/** @group Validation */
export type StandardSchemaResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: readonly StandardSchemaIssue[] };

/** @group Validation */
export interface StandardSchemaIssue {
  readonly message: string;
  readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[];
}
