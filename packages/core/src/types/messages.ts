/**
 * Every string the engine can generate for validation. Parameterized
 * messages are functions, so locales control word order and pluralization.
 * `min`/`max` cover numbers; `dateMin`/`dateMax` receive ISO date strings.
 *
 * @group Messages
 */
export interface ValidationMessages {
  required: string;
  minLength: (min: number) => string;
  maxLength: (max: number) => string;
  pattern: string;
  min: (min: number) => string;
  max: (max: number) => string;
  dateMin: (min: string) => string;
  dateMax: (max: string) => string;
  minItems: (min: number) => string;
  maxItems: (max: number) => string;
}

/**
 * List-mechanics strings, used by list renderers for visible labels and
 * accessible names. `rowName` builds the per-row identifier that remove
 * buttons and cell labels embed — "row 2 (owner)".
 *
 * @group Messages
 */
export interface ListMessages {
  add: string;
  remove: (rowName: string) => string;
  rowName: (position: number, key: string | undefined) => string;
  keyCell: string;
  valueCell: string;
}

/**
 * All engine-generated strings. Every generated string routes through
 * here, so a locale override can reach all of them.
 *
 * @group Messages
 */
export interface EngineMessages {
  validation: ValidationMessages;
  lists: ListMessages;
}

/**
 * A partial override, mergeable over the defaults section by section.
 *
 * @group Messages
 */
export interface EngineMessagesOverride {
  validation?: Partial<ValidationMessages>;
  lists?: Partial<ListMessages>;
}
