"use server";

import { createClient } from "@/lib/supabase/server";
import {
  type ClassSummary,
  type StudentClassJoinRow,
  type StudentClassSummary,
} from "@/lib/types/domain";
// import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createClass(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const name = formData.get("name") as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return;
  }

  const { error } = await supabase.from("classes").insert({
    name,
    instructor_id: user.id,
    status: "active",
    current_period: 0,
  });

  if (error) {
    console.error("Error creating class:", error);
    return;
  }

  revalidatePath("/instructor/classes");
}

export async function getInstructorClasses(): Promise<ClassSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("classes")
    .select("id, name, status, current_period")
    .eq("instructor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching classes:", error);
    return [];
  }

  return (data ?? []) as ClassSummary[];
}

export async function getStudentClasses(): Promise<StudentClassSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // This requires a join, but Supabase JS syntax handles it if relations are set up,
  // or we can just fetch from students_classes
  const { data, error } = await supabase
    .from("students_classes")
    .select(`
        class_id,
        classes (
            id,
            name,
            current_period,
            status
        ),
        team_id,
        teams (
            country
        )
      `)
    .eq("student_id", user.id);

  if (error) {
    console.error("Error fetching student classes:", error);
    return [];
  }

  const rows = (data ?? []) as StudentClassJoinRow[];

  return rows.flatMap((item) => {
    const classRecord = Array.isArray(item.classes)
      ? item.classes[0]
      : item.classes;
    const teamRecord = Array.isArray(item.teams) ? item.teams[0] : item.teams;

    if (!classRecord) {
      return [];
    }

    return [
      {
        ...classRecord,
        team_country: teamRecord?.country ?? null,
      },
    ];
  });
}

export async function updateClassPeriod(classId: string, period: number) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("classes")
    .update({ current_period: period })
    .eq("id", classId);

  if (error) return { error: error.message };
  revalidatePath(`/instructor/classes/${classId}`);
  return { success: true };
}
