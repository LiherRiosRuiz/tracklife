import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// RTL only auto-registers cleanup when `afterEach` is a global. We keep
// `globals: false` (explicit imports, no tsconfig "types" edit), so register it here.
afterEach(cleanup);
