/**
 * Every string the engine can generate for validation. Parameterized
 * messages are functions, so locales control word order and pluralization.
 * `min`/`max` cover numbers; `dateMin`/`dateMax` receive ISO date strings.
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
 * All engine-generated strings. Grows with the engine (list mechanics,
 * boolean labels) — every generated string routes through here, so a locale
 * override can reach all of them.
 */
export interface EngineMessages {
  validation: ValidationMessages;
}

/** A partial override, mergeable over the defaults section by section. */
export interface EngineMessagesOverride {
  validation?: Partial<ValidationMessages>;
}
