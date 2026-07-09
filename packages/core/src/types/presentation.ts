/**
 * What a renderer shows for one field's validity — already gated by the
 * display policy, so renderers never decide *when* an error appears.
 *
 * `invalid` is raw validity regardless of gating, for validity indicators
 * that must not wait for touch (e.g. a disabled submit button or an
 * editor's status dot).
 *
 * @group Validation
 */
export interface FieldPresentation {
  error: string | undefined;
  /** Gated per-cell errors: row id → column → message. */
  cellErrors: ReadonlyMap<string, Readonly<Record<string, string>>>;
  invalid: boolean;
}
