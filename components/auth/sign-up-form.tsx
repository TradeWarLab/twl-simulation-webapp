"use client";

import Link from "next/link";
import { useState } from "react";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
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
	const [passwordMismatch, setPasswordMismatch] = useState(false);

	async function clientAction(formData: FormData) {
		setIsLoading(true);
		setError(null);
		setSuccess(null);
		setPasswordMismatch(false);

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
			<div
				className={cn("flex flex-col gap-6", className)}
				style={{
					fontFamily: "'Palatino Linotype', Palatino, 'Times New Roman', serif",
					color: "#0a0a0a",
				}}
				{...props}
			>
				<div className="border-2 border-black bg-white">
					<div className="border-b-2 border-black px-8 py-6 text-center">
						<div
							className="text-[10px] font-bold uppercase tracking-[0.4em] text-neutral-600"
							style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
						>
							Verify Your Email
						</div>
						<h1 className="mt-4 text-[clamp(28px,4vw,44px)] leading-tight">
							Check your inbox
						</h1>
						<p
							className="mt-3 text-sm text-muted-foreground"
							style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
						>
							{success}
						</p>
					</div>
					<div className="px-8 py-6">
						<div
							className="text-center text-sm"
							style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
						>
							<Link href="/auth/login" className="underline underline-offset-4">
								Back to Login
							</Link>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn("flex flex-col gap-6", className)}
			style={{
				fontFamily: "'Palatino Linotype', Palatino, 'Times New Roman', serif",
			}}
			{...props}
		>
			<div className="border-2 border-foreground bg-card">
				<div className="border-b-2 border-foreground px-8 py-6 text-center">
					<div
						className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground"
						style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
					>
						Create Account
					</div>
					<h1 className="mt-4 text-[clamp(28px,4vw,44px)] leading-tight">
						Sign Up
					</h1>
					<p
						className="mt-3 text-sm text-muted-foreground"
						style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
					>
						Create an account to join the platform.
					</p>
				</div>
				<div className="px-8 py-6">
					<form action={clientAction} className="flex flex-col gap-6">
						<div className="flex flex-col gap-5">
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
									className="rounded-none border-2 border-foreground focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:ring-offset-2"
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
									className="rounded-none border-2 border-foreground focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:ring-offset-2"
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
									className="rounded-none border-2 border-foreground focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:ring-offset-2"
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
									className="rounded-none border-2 border-foreground focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:ring-offset-2"
								/>
								{passwordMismatch && (
									<p
										className="text-sm text-red-600"
										role="alert"
										aria-live="polite"
									>
										Passwords do not match. Please re-enter them.
									</p>
								)}
							</div>

							<div className="grid gap-2">
								<Label htmlFor="class_code">Class Code (Optional)</Label>
								<Input
									id="class_code"
									name="class_code"
									type="text"
									placeholder="e.g. TWL-A42B39"
									className="rounded-none border-2 border-foreground focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:ring-offset-2"
								/>
								<p
									className="text-xs text-muted-foreground"
									style={{
										fontFamily: "'Helvetica Neue', Arial, sans-serif",
									}}
								>
									Join a class immediately with a code provided by your
									instructor.
								</p>
							</div>

							<div className="flex items-center space-x-2">
								<input
									type="checkbox"
									id="role"
									name="role"
									value="instructor"
									checked={isInstructor}
									onChange={(e) => setIsInstructor(e.target.checked)}
									className="h-4 w-4 accent-black"
								/>
								<Label htmlFor="role">Sign up as Instructor?</Label>
							</div>

							{error && (
								<p
									className="text-sm text-red-600"
									role="alert"
									aria-live="polite"
								>
									{error}
								</p>
							)}

							<Button
								type="submit"
								className="w-full rounded-none border-2 border-foreground bg-foreground px-6 py-5 text-xs font-bold uppercase tracking-[0.35em] text-background hover:bg-foreground/90"
								disabled={isLoading}
							>
								{isLoading ? "Creating account..." : "Sign up"}
							</Button>
						</div>
						<div
							className="mt-4 text-center text-sm"
							style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
						>
							Already have an account?{" "}
							<Link href="/auth/login" className="underline underline-offset-4">
								Login
							</Link>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
