import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StudentSimulationsList({
	enrolledClasses,
}: {
	enrolledClasses: any[];
}) {
	return (
		<Card className="mb-8">
			<CardHeader>
				<CardTitle>My Simulations</CardTitle>
			</CardHeader>
			<CardContent>
				{enrolledClasses.length === 0 ? (
					<div className="text-center py-8">
						<p className="text-muted-foreground mb-4">
							You are not enrolled in any simulations yet.
						</p>
						<p className="text-sm text-muted-foreground">
							Wait for your instructor to add you or enter a class code below.
						</p>
					</div>
				) : (
					<div className="grid gap-4">
						{enrolledClasses.map((cls) => (
							<div
								key={cls.id}
								className="border p-4 rounded-md flex justify-between items-center"
							>
								<div>
									<h3 className="font-semibold text-lg">{cls.name}</h3>
									<p className="text-sm text-muted-foreground">
										Team: {cls.team_country}
									</p>
								</div>
								<Button asChild>
									<Link href={`/student/simulation/${cls.id}`}>
										Enter Simulation
									</Link>
								</Button>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
