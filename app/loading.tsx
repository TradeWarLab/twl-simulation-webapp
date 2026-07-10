import { LoadingScreen } from "@/components/shared/loading-screen";

// Site-wide route loading UI — shown during navigation whenever a destination
// route (without its own loading.tsx) suspends.
export default function Loading() {
	return <LoadingScreen />;
}
