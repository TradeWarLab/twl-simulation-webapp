import Link from "next/link";

export default function NotFound() {
	return (
		<div
			style={{
				minHeight: "100vh",
				background: "#fff",
				fontFamily: "'Palatino Linotype', Palatino, 'Times New Roman', serif",
				display: "flex",
				flexDirection: "column",
				color: "#0a0a0a",
			}}
		>
			<nav
				style={{
					borderBottom: "3px solid #0a0a0a",
					padding: "0",
				}}
			>
				<div
					style={{
						maxWidth: "1100px",
						margin: "0 auto",
						display: "grid",
						gridTemplateColumns: "1fr",
						alignItems: "center",
					}}
				>
					<div
						style={{
							padding: "20px 40px",
							display: "flex",
							alignItems: "center",
							gap: "12px",
						}}
					>
						<Link
							href="/"
							style={{
								fontFamily: "'Helvetica Neue', Arial, sans-serif",
								fontSize: "17px",
								fontWeight: "900",
								letterSpacing: "-0.5px",
								textDecoration: "none",
								color: "#0a0a0a",
							}}
						>
							TRADE WAR LAB
						</Link>
					</div>
				</div>
			</nav>

			<main
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
					textAlign: "center",
					padding: "72px 40px",
					borderBottom: "3px solid #0a0a0a",
				}}
			>
				<div style={{ maxWidth: "600px", width: "100%" }}>
					<div
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
						Error 404
					</div>

					<h1
						style={{
							fontSize: "clamp(52px, 7vw, 88px)",
							fontWeight: "400",
							lineHeight: 1.1,
							margin: "0 0 40px 0",
							letterSpacing: "-1.5px",
						}}
					>
						Page Not <em>Found.</em>
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
							maxWidth: "440px",
							margin: "0 auto",
							fontFamily: "'Helvetica Neue', Arial, sans-serif",
							fontWeight: "400",
						}}
					>
						The page you&apos;re looking for doesn&apos;t exist or has been
						moved.
					</p>

					<div style={{ marginTop: "48px" }}>
						<Link
							href="/"
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
							}}
						>
							Return Home &rarr;
						</Link>
					</div>
				</div>
			</main>
		</div>
	);
}
