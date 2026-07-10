import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Full-height branded loading state. Used by `app/loading.tsx` for route
 * transitions and as a Suspense fallback on data-heavy pages.
 */
export function LoadingScreen({
	label = "Loading…",
	className,
}: {
	label?: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex min-h-svh flex-col items-center justify-center gap-5 bg-background text-foreground",
				className,
			)}
		>
			<Image
				src="/trade-war-lab-logo.png"
				alt=""
				width={52}
				height={52}
				priority
				className="rounded-lg motion-safe:animate-pulse"
			/>
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<span
					className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-foreground motion-reduce:animate-none"
					aria-hidden="true"
				/>
				<span>{label}</span>
			</div>
		</div>
	);
}
