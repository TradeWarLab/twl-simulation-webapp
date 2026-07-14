import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HomeNav() {
	return (
		<nav className="border-b border-border">
			<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
				<a
					href="https://tradewarlab.com"
					target="_blank"
					rel="noopener noreferrer"
					className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-70"
				>
					<Image
						src="/trade-war-lab-logo.png"
						alt=""
						width={28}
						height={28}
						className="h-7 w-7 shrink-0 rounded-md"
					/>
					<span className="truncate text-[15px] font-bold uppercase tracking-[0.1em]">
						Trade War Lab
					</span>
				</a>
				<div className="flex shrink-0 items-center gap-2">
					<Button asChild variant="ghost" size="sm">
						<Link href="/auth/login">Log in</Link>
					</Button>
					<Button asChild size="sm">
						<Link href="/auth/sign-up">Sign up</Link>
					</Button>
				</div>
			</div>
		</nav>
	);
}
