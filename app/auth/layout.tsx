import { HomeNav } from "@/components/shared/home-nav";

// Shared chrome for every /auth/* page: the site header on top, the form
// centered below. Theme-aware through tokens so it matches the rest of the app.
export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-svh flex-col bg-background text-foreground">
			<HomeNav />
			<main className="flex flex-1 items-center justify-center p-6 md:p-10">
				{children}
			</main>
		</div>
	);
}
