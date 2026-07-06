"use client";
import Image from "next/image";
import { useState } from "react";

export function HomeNav() {
	const [hoverLogin, setHoverLogin] = useState(false);
	const [hoverSignup, setHoverSignup] = useState(false);
	const [focusLogin, setFocusLogin] = useState(false);
	const [focusSignup, setFocusSignup] = useState(false);

	return (
		<nav
			className="home-nav"
			style={{
				borderBottom: "3px solid #0a0a0a",
				padding: "0",
			}}
		>
			<div
				className="home-nav-inner"
				style={{
					maxWidth: "1100px",
					margin: "0 auto",
					display: "grid",
					gridTemplateColumns: "1fr auto",
					alignItems: "center",
					minWidth: 0,
				}}
			>
				<div
					className="home-nav-logo"
					style={{
						padding: "20px 40px",
						borderRight: "3px solid #0a0a0a",
						display: "flex",
						alignItems: "center",
						gap: "12px",
						minWidth: 0,
					}}
				>
					<a
						href="https://tradewarlab.com"
						target="_blank"
						rel="noopener noreferrer"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "12px",
							textDecoration: "none",
							color: "#0a0a0a",
							minWidth: 0,
						}}
					>
						<Image
							src="/trade-war-lab-logo.png"
							alt=""
							width={30}
							height={30}
							style={{ borderRadius: "6px", flexShrink: 0 }}
						/>
						<span
							style={{
								fontFamily: "'Helvetica Neue', Arial, sans-serif",
								fontSize: "17px",
								fontWeight: "900",
								letterSpacing: "-0.5px",
								overflowWrap: "break-word",
							}}
						>
							TRADE WAR LAB
						</span>
					</a>
				</div>
				<div
					className="home-nav-actions"
					style={{
						padding: "20px 40px",
						display: "flex",
						alignItems: "center",
						justifyContent: "flex-end",
						gap: "12px",
						minWidth: 0,
					}}
				>
					<a
						href="/auth/login"
						onMouseEnter={() => setHoverLogin(true)}
						onMouseLeave={() => setHoverLogin(false)}
						onFocus={() => setFocusLogin(true)}
						onBlur={() => setFocusLogin(false)}
						style={{
							padding: "10px 28px",
							minHeight: "44px",
							fontSize: "12px",
							fontFamily: "'Helvetica Neue', Arial, sans-serif",
							fontWeight: "700",
							letterSpacing: "1px",
							textDecoration: "none",
							textTransform: "uppercase",
							color: hoverLogin ? "#fff" : "#0a0a0a",
							background: hoverLogin ? "#0a0a0a" : "transparent",
							border: "2px solid #0a0a0a",
							transition: "all 0.15s",
							outline: focusLogin ? "3px solid #0a0a0a" : "none",
							outlineOffset: "2px",
						}}
					>
						Log In
					</a>
					<a
						href="/auth/sign-up"
						onMouseEnter={() => setHoverSignup(true)}
						onMouseLeave={() => setHoverSignup(false)}
						onFocus={() => setFocusSignup(true)}
						onBlur={() => setFocusSignup(false)}
						style={{
							padding: "10px 28px",
							minHeight: "44px",
							fontSize: "12px",
							fontFamily: "'Helvetica Neue', Arial, sans-serif",
							fontWeight: "700",
							letterSpacing: "1px",
							textDecoration: "none",
							textTransform: "uppercase",
							background: "#0a0a0a",
							border: "2px solid #0a0a0a",
							color: "#fff",
							transition: "all 0.15s",
							opacity: hoverSignup ? 0.8 : 1,
							outline: focusSignup ? "3px solid #0a0a0a" : "none",
							outlineOffset: "2px",
						}}
					>
						Sign Up
					</a>
				</div>
			</div>
		</nav>
	);
}
