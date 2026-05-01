import "@testing-library/jest-dom/vitest";
import { beforeEach, vi } from "vitest";
import { mockClient } from "./helpers/supabase-mock";

// ─── Browser / JSDOM Polyfills ────────
class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // Deprecated
		removeListener: vi.fn(), // Deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Polyfill pointer events for radux-ui and dnd-kit
if (
	typeof window !== "undefined" &&
	typeof window.PointerEvent === "undefined"
) {
	class PointerEvent extends Event {
		pointerId: number;
		constructor(type: string, params: any = {}) {
			super(type, params);
			this.pointerId = params.pointerId || 0;
		}
	}
	(window as any).PointerEvent = PointerEvent;
}
if (typeof Element !== "undefined" && !Element.prototype.hasPointerCapture) {
	Element.prototype.hasPointerCapture = () => false;
	Element.prototype.setPointerCapture = () => {};
	Element.prototype.releasePointerCapture = () => {};
}

// Provide a deterministic crypto.randomUUID for test reproducibility
let uuidCounter = 0;
vi.stubGlobal("crypto", {
	...globalThis.crypto,
	randomUUID: () => `test-uuid-${++uuidCounter}`,
});

// Reset the counter between tests
beforeEach(() => {
	uuidCounter = 0;
	mockClient._builders.clear();
	mockClient.auth.getUser.mockReset();
	mockClient.auth.getUser.mockResolvedValue({
		data: { user: { id: "user-1", email: "test@test.com" } },
	});
	mockClient.auth.signInWithPassword.mockReset();
	mockClient.auth.signInWithPassword.mockResolvedValue({ error: null });
	mockClient.auth.signUp.mockReset();
	mockClient.auth.signUp.mockResolvedValue({
		data: { user: { id: "user-1" }, session: null },
		error: null,
	});
	mockClient.auth.signOut.mockReset();
	mockClient.auth.signOut.mockResolvedValue({ error: null });
	mockClient.auth.getClaims.mockReset();
	mockClient.auth.getClaims.mockResolvedValue({
		data: { claims: { sub: "user-1" } },
	});
	mockClient.from.mockClear();
	mockClient.rpc.mockReset();
	mockClient.channel.mockClear();
	mockClient.removeChannel.mockClear();
});

// ─── Global Mocks for Next.js and Supabase ────────────────

vi.mock("@/lib/supabase/server", async () => {
	const { mockClient } = await import("./helpers/supabase-mock");
	return {
		createClient: vi.fn().mockResolvedValue(mockClient),
	};
});

vi.mock("@/lib/supabase/client", async () => {
	const { mockClient } = await import("./helpers/supabase-mock");
	return {
		createClient: vi.fn().mockReturnValue(mockClient),
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
