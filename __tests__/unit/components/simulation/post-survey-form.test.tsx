import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PostSurveyForm } from "@/components/simulation/post-survey-form";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/app/actions/post-survey", () => ({ submitPostSurvey: vi.fn() }));

describe("PostSurveyForm", () => {
	it("renders every question with required inputs", () => {
		// DOM queries, not role queries: role queries over ~45 radios are slow
		// enough to time out on a busy machine.
		const { container } = render(
			<PostSurveyForm classId="class-1" dealReached />,
		);
		expect(container.querySelectorAll("fieldset")).toHaveLength(8);
		for (const radio of container.querySelectorAll("input[type=radio]")) {
			expect(radio).toBeRequired();
		}
	});

	it("uses the no-deal wording for the trust question", () => {
		render(<PostSurveyForm classId="class-1" dealReached={false} />);
		expect(screen.getByText(/would have carried out/)).toBeInTheDocument();
	});
});
