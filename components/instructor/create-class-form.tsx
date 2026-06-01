import { createClass } from "@/app/actions/classes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_NOTEBOOKLM_URL =
	"https://notebooklm.google.com/notebook/6a4d5fed-304b-4640-b573-ae55edd18d91";

export function CreateClassForm() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Create New Class</CardTitle>
			</CardHeader>
			<CardContent>
				<form action={createClass} className="flex flex-col gap-5">
					<div className="flex flex-col gap-2">
						<Label htmlFor="class-name">Class Name</Label>
						<Input
							id="class-name"
							name="name"
							placeholder="e.g. POLS 170 — Spring 2026"
							required
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="notebooklm-url">
							NotebookLM URL{" "}
							<span className="font-normal text-muted-foreground">
								(optional)
							</span>
						</Label>
						<Input
							id="notebooklm-url"
							name="notebooklm_url"
							type="url"
							defaultValue={DEFAULT_NOTEBOOKLM_URL}
						/>
						<p className="text-xs text-muted-foreground">
							Pre-filled with the default TWL notebook. Replace if using a
							different one.
						</p>
					</div>
					<Button type="submit" className="w-full">
						Create Class
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
