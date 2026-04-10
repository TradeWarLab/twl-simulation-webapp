"use client";
import { useState } from "react";

export function HomeHero() {
	const [focusCta, setFocusCta] = useState(false);

	return (
		<div
			className="home-hero-wrap"
			style={{
				display: "grid",
				gridTemplateColumns: "1fr",
				borderBottom: "3px solid #0a0a0a",
			}}
		>
			<div
				className="home-hero"
				style={{
					padding: "72px 40px",
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					alignItems: "center",
					textAlign: "center",
				}}
			>
				<div
					className="home-hero-inner"
					style={{ maxWidth: "760px", width: "100%" }}
				>
					<div
						className="home-kicker"
						style={{
							fontFamily: "'Helvetica Neue', Arial, sans-serif",
							fontSize: "10px",
							fontWeight: "700",
							letterSpacing: "4px",
							color: "#888",
							textTransform: "uppercase",
							marginBottom: "28px",
						}}
					>
						U.S.– China Relations · Policy Simulation Platform
					</div>

					<h1
						style={{
							fontSize: "clamp(52px, 7vw, 88px)",
							fontWeight: "400",
							lineHeight: 1.1,
							margin: "0 0 40px 0",
							letterSpacing: "-1.5px",
							overflowWrap: "break-word",
							hyphens: "auto",
						}}
					>
						Modeling
						<br />
						Trump&apos;s First<br></br> <em>Trade War.</em>
					</h1>

					<div
						style={{
							width: "56px",
							height: "3px",
							background: "#0a0a0a",
							margin: "0 auto 32px auto",
						}}
					/>

					<p
						style={{
							fontSize: "16px",
							lineHeight: 1.75,
							color: "#333",
							maxWidth: "520px",
							margin: "0 auto",
							fontFamily: "'Helvetica Neue', Arial, sans-serif",
							fontWeight: "400",
							overflowWrap: "break-word",
							hyphens: "auto",
						}}
					>
						An interactive simulation environment for researchers, students, and
						policy professionals studying the economic and geopolitical
						dimensions of U.S.–China trade conflict.
					</p>
				</div>

				<div className="home-cta-wrap" style={{ marginTop: "48px" }}>
					<a
						className="home-cta"
						href="/auth/sign-up"
						onFocus={() => setFocusCta(true)}
						onBlur={() => setFocusCta(false)}
						style={{
							display: "inline-block",
							background: "#0a0a0a",
							color: "#fff",
							padding: "18px 48px",
							minHeight: "48px",
							fontSize: "12px",
							letterSpacing: "3px",
							fontWeight: "700",
							textDecoration: "none",
							textTransform: "uppercase",
							fontFamily: "'Helvetica Neue', Arial, sans-serif",
							outline: focusCta ? "3px solid #0a0a0a" : "none",
							outlineOffset: "3px",
						}}
					>
						Begin Simulation →
					</a>
				</div>
			</div>
		</div>
	);
}
