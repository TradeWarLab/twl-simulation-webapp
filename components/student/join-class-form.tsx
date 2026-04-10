import { enrollStudentByCode } from "@/app/actions/classes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function JoinClassForm() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Join a Class</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					action={async (formData: FormData) => {
						"use server";
						const code = formData.get("class_code") as string;
						if (code) await enrollStudentByCode(code.trim());
					}}
					className="flex max-w-sm items-center gap-2"
				>
					<Input
						name="class_code"
						placeholder="Enter Class Code (e.g. TWL-A42B39)"
						required
					/>
					<Button type="submit">Join</Button>
				</form>
			</CardContent>
		</Card>
	);
}
