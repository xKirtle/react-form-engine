// vitest-axe's matchers, registered in test-setup.ts. The augmentation
// lives here (inside the tsconfig include) so the typecheck program sees
// it. The import makes this file a module — without it, `declare module`
// would *replace* vitest's types rather than augment them.
import "vitest";

declare module "vitest" {
  interface Assertion {
    toHaveNoViolations(): void;
  }
}
