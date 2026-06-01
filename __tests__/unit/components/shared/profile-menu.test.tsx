import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileMenu } from "@/components/shared/profile-menu";
import { mockClient } from "../../../helpers/supabase-mock";

const mockRouter = {
	push: vi.fn(),
	replace: vi.fn(),
	refresh: vi.fn(),
	back: vi.fn(),
	forward: vi.fn(),
	prefetch: vi.fn(),
};

vi.mock("next/navigation", async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		useRouter: () => mockRouter,
	};
});

describe("ProfileMenu", () => {
	it("renders the user initial as the avatar", () => {
		render(<ProfileMenu email="alice@example.com" />);

		const trigger = screen.getByLabelText("Profile menu");
		expect(trigger).toBeInTheDocument();
		expect(trigger).toHaveTextContent("A");
	});

	it("shows uppercase initial for lowercase email", () => {
		render(<ProfileMenu email="bob@test.com" />);

		expect(screen.getByLabelText("Profile menu")).toHaveTextContent("B");
	});

	it("opens dropdown and shows email on click", async () => {
		const user = userEvent.setup();
		render(<ProfileMenu email="student@university.edu" />);

		await user.click(screen.getByLabelText("Profile menu"));

		expect(screen.getByText("Signed in as")).toBeInTheDocument();
		expect(screen.getByText("student@university.edu")).toBeInTheDocument();
		expect(screen.getByText("Log out")).toBeInTheDocument();
	});

	it("calls signOut and redirects on logout click", async () => {
		const user = userEvent.setup();
		render(<ProfileMenu email="test@test.com" />);

		await user.click(screen.getByLabelText("Profile menu"));
		await user.click(screen.getByText("Log out"));

		expect(mockClient.auth.signOut).toHaveBeenCalled();
		expect(mockRouter.push).toHaveBeenCalledWith("/auth/login");
	});
});
