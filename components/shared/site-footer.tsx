import Image from "next/image";
import Link from "next/link";

type FooterLink = { label: string; href: string; external?: boolean };
type FooterGroup = { title: string; links: FooterLink[] };

const LAB_LINKS: FooterLink[] = [
	{ label: "Substack", href: "https://tradewarlab.com", external: true },
	{
		label: "LinkedIn",
		href: "https://www.linkedin.com/company/the-trade-war-lab",
		external: true,
	},
];

const LEGAL_LINKS: FooterLink[] = [
	{ label: "Privacy", href: "/privacy" },
	{ label: "Terms", href: "/terms" },
];

const GROUPS: FooterGroup[] = [
	{ title: "Trade War Lab", links: LAB_LINKS },
	{ title: "Legal", links: LEGAL_LINKS },
];

const COPYRIGHT_YEAR = 2026;

function FooterAnchor({ link }: { link: FooterLink }) {
	const className =
		"text-muted-foreground transition-colors hover:text-foreground";
	if (link.external) {
		return (
			<a
				href={link.href}
				target="_blank"
				rel="noopener noreferrer"
				className={className}
			>
				{link.label}
			</a>
		);
	}
	return (
		<Link href={link.href} className={className}>
			{link.label}
		</Link>
	);
}

export function SiteFooter() {
	return (
		<footer className="border-t bg-background text-foreground">
			<div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
				<div className="flex flex-col justify-between gap-12 md:flex-row">
					<div className="flex flex-col justify-between gap-10">
						<a
							href="https://tradewarlab.com"
							target="_blank"
							rel="noopener noreferrer"
							className="group flex items-center gap-2.5"
						>
							{/* The lab's site/Substack logo (lifted from its header).
							    Decorative alt — the wordmark carries the link's name. */}
							<Image
								src="/trade-war-lab-logo.png"
								alt=""
								width={28}
								height={28}
								className="h-7 w-7 shrink-0 rounded-md"
							/>
							<span
								className="text-foreground transition-opacity group-hover:opacity-70"
								style={{
									fontSize: "17px",
									fontWeight: 900,
									letterSpacing: "-0.5px",
								}}
							>
								TRADE WAR LAB
							</span>
						</a>
						<div className="text-xs text-muted-foreground">
							© {COPYRIGHT_YEAR} Trade War Lab
						</div>
					</div>

					{/* Link groups */}
					<div className="grid grid-cols-2 gap-x-12 gap-y-10 sm:gap-x-20">
						{GROUPS.map((group) => (
							<div key={group.title}>
								<div className="mb-4 text-sm font-bold text-foreground">
									{group.title}
								</div>
								<ul className="space-y-2.5 text-sm">
									{group.links.map((link) => (
										<li key={link.label}>
											<FooterAnchor link={link} />
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>
			</div>
		</footer>
	);
}
