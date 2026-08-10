"use client";

import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Submit button that confirms before letting the form's server action run.
 *
 * Clicking a submit button is what triggers submission, so preventing the
 * click is enough. That keeps SessionControlPanel a server component: only
 * this leaf needs to be interactive.
 */
export function ConfirmSubmitButton({
	confirmMessage,
	children,
	...props
}: ButtonProps & { confirmMessage: string }) {
	return (
		<Button
			type="submit"
			onClick={(event) => {
				if (!window.confirm(confirmMessage)) event.preventDefault();
			}}
			{...props}
		>
			{children}
		</Button>
	);
}
