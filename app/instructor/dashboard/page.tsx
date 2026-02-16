import { getInstructorClasses, createClass } from "@/app/actions/classes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function InstructorDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const classes = await getInstructorClasses();

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Instructor Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Logged in as: {user.email}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Class</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createClass} className="flex gap-4">
              <Input name="name" placeholder="Class Name (e.g. Spring 2026)" required />
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Classes</CardTitle>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <p className="text-muted-foreground">No classes created yet.</p>
            ) : (
              <ul className="space-y-2">
                {classes.map((cls) => (
                  <li key={cls.id} className="border p-4 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                    <Link href={`/instructor/classes/${cls.id}`} className="flex justify-between items-center">
                      <span className="font-medium">{cls.name}</span>
                      <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {cls.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
