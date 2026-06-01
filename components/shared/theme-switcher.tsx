"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const THEME_PREFERENCE_KEY = "twl-theme-preference";

const ThemeSwitcher = () => {
	const [mounted, setMounted] = useState(false);
	const { setTheme, resolvedTheme } = useTheme();

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return null;
	}

	const isDark = resolvedTheme === "dark";

	function toggle() {
		const next = isDark ? "light" : "dark";
		setTheme(next);
		// Persist manual choice so ThemeInitializer won't override
		localStorage.setItem(THEME_PREFERENCE_KEY, next);
	}

	return (
		<button
			onClick={toggle}
			aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
			className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground border border-border transition-colors hover:text-foreground hover:bg-muted"
			id="theme-toggle"
		>
			{isDark ? (
				<Sun size={17} className="text-amber-400" />
			) : (
				<Moon size={17} className="text-indigo-500" />
			)}
		</button>
	);
};

export { ThemeSwitcher };
