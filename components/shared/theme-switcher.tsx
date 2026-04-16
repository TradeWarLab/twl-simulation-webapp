"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const THEME_PREFERENCE_KEY = "twl-theme-preference";

const ThemeSwitcher = () => {
	const [mounted, setMounted] = useState(false);
	const { theme, setTheme, resolvedTheme } = useTheme();

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
		<Button
			variant="ghost"
			size="sm"
			onClick={toggle}
			aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
			className="gap-2 text-muted-foreground hover:text-foreground"
			id="theme-toggle"
		>
			{isDark ? (
				<Sun size={16} className="text-amber-400" />
			) : (
				<Moon size={16} className="text-indigo-500" />
			)}
			<span className="text-xs font-medium">{isDark ? "Light" : "Dark"}</span>
		</Button>
	);
};

export { ThemeSwitcher };
