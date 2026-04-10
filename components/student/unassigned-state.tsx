import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UnassignedState() {
	return (
		<main className="flex-1 flex items-center justify-center">
			<Card className="w-full max-w-md p-6 text-center">
				<CardHeader>
					<CardTitle className="text-2xl text-slate-700">
						Waiting for Assignment
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">
						Your instructor has not yet assigned you to a team. Please wait.
					</p>
				</CardContent>
			</Card>
		</main>
	);
}
