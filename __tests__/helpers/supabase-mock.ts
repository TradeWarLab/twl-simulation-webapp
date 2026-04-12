import { vi } from "vitest";

// ─── Chainable Query Builder Mock ───────────────────────────
//
// Simulates Supabase's chained query API:
//   supabase.from("table").select("*").eq("col", val).single()
//
// Each method returns the builder itself for chaining.
// The terminal methods (single, maybeSingle, or the last chain call)
// resolve to the configured response.

type MockResponse = {
	data: unknown;
	error: null | { message: string };
};

export function createChainableBuilder(
	response: MockResponse = { data: null, error: null },
) {
	const builder: Record<string, unknown> = {};

	const chainMethods = [
		"select",
		"insert",
		"update",
		"upsert",
		"delete",
		"eq",
		"neq",
		"in",
		"is",
		"gt",
		"lt",
		"gte",
		"lte",
		"like",
		"ilike",
		"order",
		"limit",
		"range",
		"filter",
		"not",
		"or",
		"match",
		"textSearch",
	];

	for (const method of chainMethods) {
		builder[method] = vi.fn().mockReturnValue(builder);
	}

	// Terminal methods that return the response
	builder.single = vi.fn().mockResolvedValue(response);
	builder.maybeSingle = vi.fn().mockResolvedValue(response);

	// Make the builder itself thenable (for queries without single/maybeSingle)
	builder.then = vi.fn((resolve: (value: MockResponse) => void) => {
		resolve(response);
		return Promise.resolve(response);
	});

	return builder;
}

// ─── Mock Supabase Client Factory ───────────────────────────

export type MockSupabaseClient = {
	from: ReturnType<typeof vi.fn>;
	rpc: ReturnType<typeof vi.fn>;
	auth: {
		getUser: ReturnType<typeof vi.fn>;
		signInWithPassword: ReturnType<typeof vi.fn>;
		signUp: ReturnType<typeof vi.fn>;
		signOut: ReturnType<typeof vi.fn>;
		getClaims: ReturnType<typeof vi.fn>;
	};
	channel: ReturnType<typeof vi.fn>;
	removeChannel: ReturnType<typeof vi.fn>;
	_builders: Map<string, ReturnType<typeof createChainableBuilder>>;
	_mockTable: (table: string, response: MockResponse) => void;
};

export function createMockSupabaseClient(): MockSupabaseClient {
	const builders = new Map<string, ReturnType<typeof createChainableBuilder>>();

	const mockClient: MockSupabaseClient = {
		from: vi.fn((table: string) => {
			let builder = builders.get(table);
			if (!builder) {
				builder = createChainableBuilder();
				builders.set(table, builder);
			}
			return builder;
		}),
		rpc: vi.fn(),
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: { user: { id: "user-1", email: "test@test.com" } },
			}),
			signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
			signUp: vi.fn().mockResolvedValue({
				data: { user: { id: "user-1" }, session: null },
				error: null,
			}),
			signOut: vi.fn().mockResolvedValue({ error: null }),
			getClaims: vi.fn().mockResolvedValue({
				data: { claims: { sub: "user-1" } },
			}),
		},
		channel: vi.fn().mockReturnValue({
			on: vi.fn().mockReturnThis(),
			subscribe: vi.fn((cb) => {
				if (cb) cb("SUBSCRIBED");
			}),
			unsubscribe: vi.fn(),
		}),
		removeChannel: vi.fn(),
		_builders: builders,
		_mockTable: (table: string, response: MockResponse) => {
			builders.set(table, createChainableBuilder(response));
		},
	};

	return mockClient;
}

export const mockClient = createMockSupabaseClient();

/**
 * Sentinel error used to detect `redirect()` calls in tests.
 * Since Next.js `redirect()` throws, we simulate that behavior.
 */
export class RedirectError extends Error {
	public url: string;
	constructor(url: string) {
		super(`NEXT_REDIRECT: ${url}`);
		this.name = "RedirectError";
		this.url = url;
	}
}
