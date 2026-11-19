import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoundTimer } from "@/components/simulation/round-timer";
import { createClassStore } from "@/lib/realtime/class-store";
import { ClassStoreContext } from "@/lib/realtime/hooks";
import { makeSnapshot } from "../../../helpers/realtime-fixtures";

const NOW = new Date("2026-11-18T20:00:00Z").getTime();

function renderTimer(
	currentPeriod: number,
	startedMinutesAgo: number | null,
	audience: "student" | "instructor" = "student",
) {
	const store = createClassStore(
		makeSnapshot({
			classRecord: {
				id: "class-1",
				name: "Test Class",
				class_code: "ABC123",
				current_period: currentPeriod,
				status: "active",
				round2_started_at:
					startedMinutesAgo === null
						? null
						: new Date(NOW - startedMinutesAgo * 60_000).toISOString(),
			},
		}),
	);
	return render(
		<ClassStoreContext.Provider value={store}>
			<RoundTimer audience={audience} />
		</ClassStoreContext.Provider>,
	);
}

describe("RoundTimer", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("counts down from 50 minutes after Round 2 starts", () => {
		renderTimer(2, 10);

		expect(screen.getByText("40:00")).toBeInTheDocument();
		act(() => {
			vi.advanceTimersByTime(61_000);
		});
		expect(screen.getByText("38:59")).toBeInTheDocument();
	});

	it("tells the instructor to end the round when time is up", () => {
		renderTimer(2, 51, "instructor");

		expect(screen.getByRole("status")).toHaveTextContent(
			"Time is up. End the round when you are ready.",
		);
	});

	it("tells a student only that time is up", () => {
		renderTimer(2, 51);

		expect(screen.getByRole("status")).toHaveTextContent(/^Time is up$/);
	});

	it("shows nothing outside Round 2", () => {
		const { container } = renderTimer(1, 10);

		expect(container).toBeEmptyDOMElement();
	});

	it("shows nothing before the start time is known", () => {
		const { container } = renderTimer(2, null);

		expect(container).toBeEmptyDOMElement();
	});
});
