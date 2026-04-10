"use client";
import { useEffect, useState } from "react";
import { HomeHero } from "@/components/shared/home-hero";
import { HomeNav } from "@/components/shared/home-nav";

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
		<div
			className="home-shell"
			style={{
				minHeight: "100vh",
				background: "#fff",
				fontFamily: "'Palatino Linotype', Palatino, 'Times New Roman', serif",
				display: "flex",
				flexDirection: "column",
				color: "#0a0a0a",
			}}
		>
			{/* Nav — thick border bottom */}
			<HomeNav />

			{/* Hero grid */}
			<main
				className="home-main"
				style={{
					flex: 1,
					display: "grid",
					gridTemplateRows: "1fr auto",
					opacity: mounted ? 1 : 0,
					transform: mounted ? "none" : "translateY(12px)",
					transition: reducedMotion ? "none" : "all 0.6s ease",
				}}
			>
				{/* Top section: centered */}
				<HomeHero />
			</main>

			<style jsx>{`
        @media (max-width: 900px) {
          .home-nav-inner {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .home-nav-logo {
            border-right: none;
            border-bottom: 3px solid #0a0a0a;
            justify-content: center;
          }
          .home-nav-actions {
            justify-content: center;
            flex-wrap: wrap;
            padding: 16px 32px 20px;
          }
        }
        @media (max-width: 640px) {
          .home-nav-logo {
            padding: 18px 24px;
          }
          .home-hero {
            padding: 56px 24px;
          }
          .home-kicker {
            fontsize: 11px;
            letterspacing: 3px;
          }
          .home-cta-wrap {
            width: 100%;
          }
          .home-cta {
            width: 100%;
            text-align: center;
            padding: 16px 24px;
          }
        }
      `}</style>
		</div>
	);
}
