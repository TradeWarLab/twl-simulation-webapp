import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HomeHeroBureau() {
	return (
		<section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center sm:py-28">
			<div className="mx-auto flex max-w-3xl flex-col items-center">
				<p className="mb-7 font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
					U.S.–China Relations · Policy Simulation Platform
				</p>
				<h1 className="text-balance text-[clamp(2.75rem,7vw,5.25rem)] font-semibold leading-[1.04] tracking-tight">
					Modeling Trump&apos;s First{" "}
					<span className="text-primary">Trade War.</span>
				</h1>
				<div className="my-9 h-px w-14 bg-foreground/25" />
				<p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
					An interactive simulation environment for researchers, students, and
					policy professionals studying the economic and geopolitical dimensions
					of U.S.–China trade conflict.
				</p>
				<div className="mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
					<Button asChild size="lg" className="w-full sm:w-auto">
						<Link href="/auth/sign-up">Begin Simulation →</Link>
					</Button>
					<Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
						<Link href="/auth/login">Log in</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
