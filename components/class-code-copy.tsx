"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function ClassCodeCopyButton({ code }: { code: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		if (!code) return;
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			console.error("Failed to copy", error);
		}
	};

	return (
		<Button
			size="icon"
			variant="ghost"
			className="h-6 w-6"
			onClick={handleCopy}
			title="Copy class code"
		>
			{copied ? (
				<Check className="h-4 w-4 text-green-600" />
			) : (
				<Copy className="h-4 w-4" />
			)}
		</Button>
	);
}
