import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Libre_Franklin, Public_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL}`
	: "http://localhost:3000";

export const metadata: Metadata = {
	metadataBase: new URL(defaultUrl),
	title: "TWL Simulation",
	description: "Simulate the U.S.–PRC trade negotiations",
};

// Public Sans — the U.S. federal typeface (USWDS); the body / UI voice.
const publicSans = Public_Sans({
	variable: "--font-sans",
	display: "swap",
	subsets: ["latin"],
});

// Libre Franklin — grotesk display face for headings and index numerals.
const libreFranklin = Libre_Franklin({
	variable: "--font-display",
	display: "swap",
	subsets: ["latin"],
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${publicSans.variable} ${libreFranklin.variable} font-sans antialiased`}
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					enableSystem={false}
					disableTransitionOnChange
				>
					{children}
				</ThemeProvider>
				<SpeedInsights />
			</body>
		</html>
	);
}
