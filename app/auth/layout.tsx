import { HomeNav } from "@/components/shared/home-nav";

// Shared chrome for every /auth/* page: the site header on top, the form
// centered below. Forced light to match the marketing/auth aesthetic.
export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div
			className="light flex min-h-svh flex-col bg-white text-[#0a0a0a]"
			data-theme="light"
			style={{ colorScheme: "light" }}
		>
			<HomeNav />
			<main className="flex flex-1 items-center justify-center p-6 md:p-10">
				{children}
			</main>
		</div>
	);
}
