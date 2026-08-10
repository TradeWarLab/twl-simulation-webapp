import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SimulationLogSnapshot } from "@/app/actions/log";
import { LogClient } from "@/components/instructor/log-client";
import { mockClient } from "../../../helpers/supabase-mock";

const channelStub = {
	on: vi.fn(() => channelStub),
	subscribe: vi.fn(() => channelStub),
};

const SNAPSHOT: SimulationLogSnapshot = {
	messages: [],
	tradeItems: [],
	proposals: [],
	votes: [],
	teams: [
		{ id: "team-usa", country: "USA" },
		{ id: "team-china", country: "China" },
	],
	users: [],
};

describe("LogClient", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockClient.channel.mockReturnValue(channelStub);
	});

	it("subscribes the realtime channel, or the log is not live at all", () => {
		render(
			<LogClient
				classId="class-1"
				simulationName="Test Class"
				initialSnapshot={SNAPSHOT}
			/>,
		);

		expect(mockClient.channel).toHaveBeenCalledWith("instructor-log:class-1");
		expect(channelStub.on).toHaveBeenCalled();
		expect(channelStub.subscribe).toHaveBeenCalledTimes(1);
	});

	it("removes the channel on unmount", () => {
		const { unmount } = render(
			<LogClient
				classId="class-1"
				simulationName="Test Class"
				initialSnapshot={SNAPSHOT}
			/>,
		);
		unmount();
		expect(mockClient.removeChannel).toHaveBeenCalled();
	});

	it("renders the export buttons", () => {
		render(
			<LogClient
				classId="class-1"
				simulationName="Test Class"
				initialSnapshot={SNAPSHOT}
			/>,
		);
		expect(screen.getByRole("button", { name: /chats csv/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /trades csv/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /values csv/i })).toBeInTheDocument();
	});
});
