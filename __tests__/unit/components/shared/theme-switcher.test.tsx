import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetTheme = vi.fn();
let mockResolvedTheme = "light";

vi.mock("next-themes", () => ({
	useTheme: () => ({
		theme: mockResolvedTheme,
		setTheme: mockSetTheme,
		resolvedTheme: mockResolvedTheme,
	}),
}));

beforeEach(() => {
	mockSetTheme.mockClear();
	const store: Record<string, string> = {};
	vi.stubGlobal("localStorage", {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(),
		length: 0,
		key: vi.fn(),
	});
});

import { ThemeSwitcher } from "@/components/shared/theme-switcher";

describe("ThemeSwitcher", () => {
	it("renders an icon-only button with no text label", () => {
		render(<ThemeSwitcher />);

		const button = screen.getByLabelText(/Switch to .* mode/);
		expect(button).toBeInTheDocument();
		expect(button.textContent).toBe("");
	});

	it("toggles from light to dark on click", async () => {
		mockResolvedTheme = "light";
		const user = userEvent.setup();

		render(<ThemeSwitcher />);

		await user.click(screen.getByLabelText("Switch to dark mode"));
		expect(mockSetTheme).toHaveBeenCalledWith("dark");
	});

	it("toggles from dark to light on click", async () => {
		mockResolvedTheme = "dark";
		const user = userEvent.setup();

		render(<ThemeSwitcher />);

		await user.click(screen.getByLabelText("Switch to light mode"));
		expect(mockSetTheme).toHaveBeenCalledWith("light");
	});

	it("persists choice to localStorage", async () => {
		mockResolvedTheme = "light";
		const user = userEvent.setup();

		render(<ThemeSwitcher />);

		await user.click(screen.getByLabelText("Switch to dark mode"));
		expect(localStorage.setItem).toHaveBeenCalledWith(
			"twl-theme-preference",
			"dark",
		);
	});

	it("is a circular button matching avatar shape", () => {
		render(<ThemeSwitcher />);

		const button = screen.getByLabelText(/Switch to .* mode/);
		expect(button.className).toContain("rounded-full");
		expect(button.className).toContain("h-8");
		expect(button.className).toContain("w-8");
	});
});
