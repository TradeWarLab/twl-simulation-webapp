"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

const THEME_PREFERENCE_KEY = "twl-theme-preference";

/**
 * Invisible component that sets the default theme based on user role.
 * - Instructors default to light mode
 * - Students default to dark mode
 *
 * If the user has already manually chosen a theme (stored in localStorage),
 * this component respects that choice and does nothing.
 */
export function ThemeInitializer({
	userRole,
}: {
	userRole: "instructor" | "student";
}) {
	const { setTheme } = useTheme();
	const initialized = useRef(false);

	useEffect(() => {
		if (initialized.current) return;
		initialized.current = true;

		// If the user previously made a manual choice, don't override
		const stored = localStorage.getItem(THEME_PREFERENCE_KEY);
		if (stored) return;

		// Apply role-based default
		const defaultTheme = userRole === "instructor" ? "light" : "dark";
		setTheme(defaultTheme);
	}, [userRole, setTheme]);

	return null;
}
