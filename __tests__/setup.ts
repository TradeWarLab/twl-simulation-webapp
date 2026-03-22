import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Provide a deterministic crypto.randomUUID for test reproducibility
let uuidCounter = 0;
vi.stubGlobal(
  "crypto",
  {
    ...globalThis.crypto,
    randomUUID: () => `test-uuid-${++uuidCounter}`,
  },
);

// Reset the counter between tests
beforeEach(() => {
  uuidCounter = 0;
});

// ─── Global Mocks for Next.js and Supabase ────────────────

vi.mock("@/lib/supabase/server", async () => {
  const { mockClient } = await import("./helpers/supabase-mock");
  return {
    createClient: vi.fn().mockResolvedValue(mockClient),
  };
});

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT: ${url}`);
    error.name = "RedirectError";
    (error as any).url = url;
    throw error;
  }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("http://localhost:3000"),
  }),
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
    setAll: vi.fn(),
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
