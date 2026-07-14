import Link from "next/link";
import { HomeNav } from "@/components/shared/home-nav";
import { Button } from "@/components/ui/button";

export default function NotFound() {
	return (
		<div className="flex min-h-svh flex-col bg-background text-foreground">
			<HomeNav />
			<main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center sm:py-28">
				<div className="mx-auto flex max-w-xl flex-col items-center">
					<p className="mb-7 font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
						Error 404
					</p>
					<h1 className="text-balance text-[clamp(2.75rem,7vw,5.25rem)] font-semibold leading-[1.04] tracking-tight">
						Page Not <span className="text-primary">Found.</span>
					</h1>
					<div className="my-9 h-px w-14 bg-foreground/25" />
					<p className="max-w-sm text-pretty text-base leading-relaxed text-muted-foreground">
						The page you&apos;re looking for doesn&apos;t exist or has been moved.
					</p>
					<div className="mt-10">
						<Button asChild size="lg">
							<Link href="/">Return Home &rarr;</Link>
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
}
