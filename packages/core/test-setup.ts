import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// RTL's auto-cleanup needs a global afterEach, which vitest only provides
// with globals: true. Register it explicitly instead.
afterEach(cleanup);
