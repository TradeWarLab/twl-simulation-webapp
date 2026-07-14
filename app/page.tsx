"use client";
import { useEffect, useState } from "react";
import { HomeHero } from "@/components/shared/home-hero";
import { HomeNav } from "@/components/shared/home-nav";
import { SiteFooter } from "@/components/shared/site-footer";

export default function Home() {
	const [mounted, setMounted] = useState(false);
	const [reducedMotion, setReducedMotion] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const applyPref = () => setReducedMotion(mq.matches);
		applyPref();
		if (mq.addEventListener) mq.addEventListener("change", applyPref);
		else mq.addListener(applyPref);
		return () => {
			if (mq.removeEventListener) mq.removeEventListener("change", applyPref);
			else mq.removeListener(applyPref);
		};
	}, []);

	useEffect(() => {
		const delay = reducedMotion ? 0 : 80;
		const t = setTimeout(() => setMounted(true), delay);
		return () => clearTimeout(t);
	}, [reducedMotion]);

	return (
		<div className="flex min-h-svh flex-col bg-background text-foreground">
			<HomeNav />
			<main
				className="flex flex-1 flex-col"
				style={{
					opacity: mounted ? 1 : 0,
					transform: mounted ? "none" : "translateY(12px)",
					transition: reducedMotion
						? "none"
						: "opacity 0.6s ease, transform 0.6s ease",
				}}
			>
				<HomeHero />
			</main>
			<SiteFooter />
		</div>
	);
}
