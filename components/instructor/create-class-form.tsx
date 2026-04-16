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
				<form action={createClass} className="flex flex-col gap-4">
					<Input
						name="name"
						placeholder="Class Name (e.g. Spring 2026)"
						required
					/>
					<Input
						name="notebooklm_url"
						placeholder="Google NotebookLM URL (Optional)"
						type="url"
					/>
					<Button type="submit" className="w-full">Create Class</Button>
				</form>
			</CardContent>
		</Card>
	);
}
