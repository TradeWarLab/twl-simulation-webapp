import Link from "next/link";

// Single source of truth for the legal pages
export const LEGAL_CONTACT_EMAIL = "raacke@ku.edu";
export const LEGAL_LAST_UPDATED = "July 6, 2026";

export function LegalShell({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-svh bg-background text-foreground">
			<div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
				<Link
					href="/"
					className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
				>
					← Back
				</Link>

				<h1 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight">
					{title}
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Last updated: {LEGAL_LAST_UPDATED}
				</p>

				<div className="mt-8 space-y-6 text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:underline [&_a]:underline-offset-2">
					{children}
				</div>

				<div className="mt-12 border-t pt-6 text-xs text-muted-foreground">
					<Link href="/privacy" className="underline underline-offset-2">
						Privacy Policy
					</Link>
					<span className="mx-2">·</span>
					<Link href="/terms" className="underline underline-offset-2">
						Terms of Use
					</Link>
				</div>
			</div>
		</div>
	);
}
