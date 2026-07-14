"use client";

import Link from "next/link";
import { useState } from "react";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function SignUpForm({
	className,
	...props
}: React.ComponentPropsWithoutRef<"div">) {
	const [success, setSuccess] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isInstructor, setIsInstructor] = useState(false);
	const [consent, setConsent] = useState(false);
	const [passwordMismatch, setPasswordMismatch] = useState(false);

	async function clientAction(formData: FormData) {
		setIsLoading(true);
		setError(null);
		setSuccess(null);
		setPasswordMismatch(false);

		if (!consent) {
			setError(
				"Please agree to the Privacy Policy and Terms of Use to continue.",
			);
			setIsLoading(false);
			return;
		}

		const password = String(formData.get("password") || "");
		const confirmPassword = String(formData.get("confirm_password") || "");
		if (
			password.length > 0 &&
			confirmPassword.length > 0 &&
			password !== confirmPassword
		) {
			setPasswordMismatch(true);
			setIsLoading(false);
			return;
		}

		const result = await signUp(formData);

		if (result?.error) {
			setError(result.error);
			setIsLoading(false);
		} else if (result?.success) {
			setSuccess(
				"Account created! Please check your email to verify your account.",
			);
			setIsLoading(false);
		}
		// If redirected by server action, execution stops here anyway
	}

	if (success) {
		return (
			<div className={cn("flex flex-col gap-6", className)} {...props}>
				<Card>
					<CardHeader>
						<CardTitle className="text-2xl">Check your inbox</CardTitle>
						<CardDescription>Verify your email to continue</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<p className="text-sm text-muted-foreground">{success}</p>
						<div className="text-center text-sm">
							<Link href="/auth/login" className="underline underline-offset-4">
								Back to Login
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">Sign up</CardTitle>
					<CardDescription>
						Create an account to join the platform.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={clientAction} className="flex flex-col gap-6">
						<div className="grid gap-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								inputMode="email"
								autoComplete="email"
								placeholder="m@example.com"
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="full_name">Full Name</Label>
							<Input
								id="full_name"
								name="full_name"
								type="text"
								autoComplete="name"
								placeholder="John Doe"
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								name="password"
								type="password"
								autoComplete="new-password"
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="confirm_password">Confirm Password</Label>
							<Input
								id="confirm_password"
								name="confirm_password"
								type="password"
								autoComplete="new-password"
								required
							/>
							{passwordMismatch && (
								<p
									className="text-sm text-destructive"
									role="alert"
									aria-live="polite"
								>
									Passwords do not match. Please re-enter them.
								</p>
							)}
						</div>

						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="role"
								name="role"
								value="instructor"
								checked={isInstructor}
								onChange={(e) => setIsInstructor(e.target.checked)}
								className="h-4 w-4 accent-[hsl(var(--primary))]"
							/>
							<Label htmlFor="role" className="font-normal">
								Sign up as Instructor?
							</Label>
						</div>

						<div className="flex items-start gap-2">
							<input
								type="checkbox"
								id="consent"
								name="consent"
								checked={consent}
								onChange={(e) => setConsent(e.target.checked)}
								required
								className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
							/>
							<Label
								htmlFor="consent"
								className="text-sm font-normal leading-snug"
							>
								I agree to the{" "}
								<Link
									href="/privacy"
									target="_blank"
									rel="noopener noreferrer"
									className="underline underline-offset-2"
								>
									Privacy Policy
								</Link>{" "}
								and{" "}
								<Link
									href="/terms"
									target="_blank"
									rel="noopener noreferrer"
									className="underline underline-offset-2"
								>
									Terms of Use
								</Link>
								, and I consent to the collection of my simulation activity for
								educational and research purposes.
							</Label>
						</div>

						{error && (
							<p
								className="text-sm text-destructive"
								role="alert"
								aria-live="polite"
							>
								{error}
							</p>
						)}

						<Button
							type="submit"
							className="w-full"
							disabled={isLoading || !consent}
						>
							{isLoading ? "Creating account..." : "Sign up"}
						</Button>
						<div className="text-center text-sm">
							Already have an account?{" "}
							<Link href="/auth/login" className="underline underline-offset-4">
								Login
							</Link>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
