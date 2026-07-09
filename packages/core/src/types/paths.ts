type Terminal =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | RegExp
  // biome-ignore lint/suspicious/noExplicitAny: matching any function shape requires any in parameters
  | ((...args: any[]) => unknown)
  | readonly unknown[];

/**
 * Dot-separated paths addressing values inside an API model, e.g.
 * `"name" | "settings" | "settings.visibility"`. Field keys bind to these.
 *
 * Addressability rules:
 * - plain objects are traversed, yielding both the branch path and its
 *   children;
 * - arrays are leaves — list values belong to the engine's row model, so
 *   their elements are never addressed by path;
 * - built-in object types (`Date`, `RegExp`) and functions are leaves;
 * - optional objects are traversed (an absent parent is a parse concern,
 *   not a typing one).
 *
 * @group Schema
 */
export type DeepKeys<T> =
  NonNullable<T> extends infer U
    ? U extends Terminal
      ? never
      : {
          [K in keyof U & string]:
            | K
            | (DeepKeys<U[K]> extends infer Child extends string
                ? `${K}.${Child}`
                : never);
        }[keyof U & string]
    : never;

/**
 * The value type addressed by a {@link DeepKeys} path. Intermediate
 * optionality is stripped hop by hop, so a path through an optional object
 * resolves to the leaf's own type; an optional leaf keeps its `undefined`.
 * Unknown paths resolve to `never`.
 *
 * @group Schema
 */
export type DeepValue<
  T,
  P extends string,
> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof NonNullable<T>
    ? DeepValue<NonNullable<T>[Head], Rest>
    : never
  : P extends keyof NonNullable<T>
    ? NonNullable<T>[P]
    : never;
