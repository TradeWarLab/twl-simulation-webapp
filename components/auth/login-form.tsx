"use client";

import Link from "next/link";
import { useState } from "react";
import { login } from "@/app/actions/auth"; // Import server action
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function LoginForm({
	className,
	...props
}: React.ComponentPropsWithoutRef<"div">) {
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	async function clientAction(formData: FormData) {
		setIsLoading(true);
		setError(null);
		const result = await login(formData);
		if (result?.error) {
			setError(result.error);
			setIsLoading(false);
		}
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
						Secure Access
					</div>
					<h1 className="mt-4 text-[clamp(28px,4vw,44px)] leading-tight">
						Login
					</h1>
					<p
						className="mt-3 text-sm text-muted-foreground"
						style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
					>
						Enter your email and password to continue.
					</p>
				</div>
				<div className="px-8 py-6">
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
								className="rounded-none border-2 border-foreground focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:ring-offset-2"
							/>
						</div>
						<div className="grid gap-2">
							<div className="flex items-center">
								<Label htmlFor="password">Password</Label>
								<Link
									href="/auth/forgot-password"
									className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
									style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
								>
									Forgot your password?
								</Link>
							</div>
							<Input
								id="password"
								name="password"
								type="password"
								autoComplete="current-password"
								required
								className="rounded-none border-2 border-foreground focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:ring-offset-2"
							/>
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
							{isLoading ? "Logging in..." : "Login"}
						</Button>
						<div
							className="text-center text-sm"
							style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
						>
							Don&apos;t have an account?{" "}
							<Link
								href="/auth/sign-up"
								className="underline underline-offset-4"
							>
								Sign up
							</Link>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
