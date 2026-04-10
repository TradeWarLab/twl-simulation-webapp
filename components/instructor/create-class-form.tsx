import { createClass } from "@/app/actions/classes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function CreateClassForm() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Create New Class</CardTitle>
			</CardHeader>
			<CardContent>
				<form action={createClass} className="flex gap-4">
					<Input
						name="name"
						placeholder="Class Name (e.g. Spring 2026)"
						required
					/>
					<Button type="submit">Create</Button>
				</form>
			</CardContent>
		</Card>
	);
}
