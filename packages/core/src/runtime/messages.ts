import type { EngineMessages, EngineMessagesOverride } from "../types/messages";

/** @group Messages */
export const englishMessages: EngineMessages = {
  validation: {
    required: "This field is required",
    minLength: (min) => `Must be at least ${min} characters`,
    maxLength: (max) => `Must be at most ${max} characters`,
    pattern: "Invalid format",
    min: (min) => `Must be at least ${min}`,
    max: (max) => `Must be at most ${max}`,
    dateMin: (min) => `Must be on or after ${min}`,
    dateMax: (max) => `Must be on or before ${max}`,
    minItems: (min) =>
      min === 1 ? "Add at least 1 item" : `Add at least ${min} items`,
    maxItems: (max) =>
      max === 1 ? "Keep at most 1 item" : `Keep at most ${max} items`,
  },
  lists: {
    add: "Add item",
    remove: (rowName) => `Remove ${rowName}`,
    rowName: (position, key) =>
      key === undefined ? `row ${position}` : `row ${position} (${key})`,
    keyCell: "Key",
    valueCell: "Value",
  },
};

/**
 * Merges overrides onto the defaults, later overrides winning per message.
 * Sections merge shallowly — an override replaces individual messages, not
 * whole sections.
 *
 * @group Messages
 */
export function mergeMessages(
  base: EngineMessages,
  ...overrides: readonly (EngineMessagesOverride | undefined)[]
): EngineMessages {
  let validation = base.validation;
  let lists = base.lists;
  for (const override of overrides) {
    if (override?.validation !== undefined) {
      validation = { ...validation, ...override.validation };
    }
    if (override?.lists !== undefined) {
      lists = { ...lists, ...override.lists };
    }
  }
  return { validation, lists };
}
