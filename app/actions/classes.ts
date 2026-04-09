"use server";

import { createClient } from "@/lib/supabase/server";
import {
  type ClassRosterEntry,
  type ClassSummary,
  type StudentClassJoinRow,
  type StudentClassSummary,
  type TeamCountry,
} from "@/lib/types/domain";
import { revalidatePath } from "next/cache";

const VALID_NATIONS: readonly TeamCountry[] = ["USA", "China"];

function isValidNation(value: string): value is TeamCountry {
  return VALID_NATIONS.includes(value as TeamCountry);
}

function generateClassCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0/O, 1/I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TWL-${code}`;
}

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function ensureInstructorOwnsClass(
  classId: string,
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("instructor_id", userId)
    .single();

  return !error && Boolean(data);
}

export async function createClass(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const name = formData.get("name") as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return;
  }

  const { data: classData, error } = await supabase.from("classes").insert({
    name,
    class_code: generateClassCode(),
    normalized_name: normalizeName(name),
    instructor_id: user.id,
    status: "active",
    current_period: 0,
  }).select("id").single();

  if (error || !classData) {
    console.error("Error creating class:", error);
    return;
  }
  
  // Automatically create USA and China teams for the new class
  const { error: teamsError } = await supabase.from("teams").insert([
    { class_id: classData.id, country: "USA" },
    { class_id: classData.id, country: "China" }
  ]);
  
  if (teamsError) {
    console.error("Error generating base teams:", teamsError);
  }

  revalidatePath("/instructor/classes");
}

export async function inviteStudentToClass(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const classId = String(formData.get("class_id") ?? "").trim();
  const rawEmail = String(formData.get("email") ?? "").trim();
  const affiliation = String(formData.get("affiliation") ?? "").trim();
  const rawInterestBlock = String(formData.get("interest_block") ?? "").trim();

  const email = rawEmail.toLowerCase();
  const interestBlock = rawInterestBlock.length > 0 ? rawInterestBlock : null;

  if (!classId || !email || !isValidNation(affiliation)) {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const ownsClass = await ensureInstructorOwnsClass(classId, user.id);
  if (!ownsClass) {
    return;
  }

  const { error: inviteError } = await supabase.from("class_invites").upsert(
    {
      class_id: classId,
      email,
      affiliation,
      interest_block: interestBlock,
      invited_by: user.id,
      status: "pending",
    },
    { onConflict: "class_id,email" },
  );

  if (inviteError) {
    console.error("Error creating invite:", inviteError);
    return;
  }

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!existingUser) {
    revalidatePath(`/instructor/classes/${classId}`);
    return;
  }

  let teamId: string | null = null;

  const { data: existingTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("class_id", classId)
    .eq("country", affiliation)
    .maybeSingle();

  if (existingTeam?.id) {
    teamId = existingTeam.id;
  } else {
    const { data: createdTeam, error: createTeamError } = await supabase
      .from("teams")
      .insert({
        class_id: classId,
        country: affiliation,
      })
      .select("id")
      .single();

    if (createTeamError) {
      console.error("Error creating team:", createTeamError);
      revalidatePath(`/instructor/classes/${classId}`);
      return;
    }

    teamId = createdTeam.id;
  }

  const { error: enrollmentError } = await supabase.from("students_classes").upsert(
    {
      student_id: existingUser.id,
      class_id: classId,
      team_id: teamId,
      interest_block: interestBlock,
    },
    { onConflict: "student_id,class_id" },
  );

  if (enrollmentError) {
    console.error("Error enrolling invited student:", enrollmentError);
    revalidatePath(`/instructor/classes/${classId}`);
    return;
  }

  const { error: statusError } = await supabase
    .from("class_invites")
    .update({ status: "account_created" })
    .eq("class_id", classId)
    .eq("email", email);

  if (statusError) {
    console.error("Error updating invite status:", statusError);
  }

  revalidatePath(`/instructor/classes/${classId}`);
}

export async function getClassRoster(classId: string): Promise<ClassRosterEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const ownsClass = await ensureInstructorOwnsClass(classId, user.id);
  if (!ownsClass) return [];

  // Map to store combined roster entries by lowercase email
  const rosterMap = new Map<string, ClassRosterEntry>();

  // 1. Fetch direct enrollments from students_classes
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("students_classes")
    .select(`
      student_id,
      interest_block,
      joined_at,
      users (
        email,
        full_name
      ),
      teams (
        country
      )
    `)
    .eq("class_id", classId);

  if (enrollmentError) {
    console.error("Error fetching enrollments:", enrollmentError);
  } else if (enrollments) {
    for (const en of enrollments) {
      const userRecord = Array.isArray(en.users) ? en.users[0] : en.users;
      const teamRecord = Array.isArray(en.teams) ? en.teams[0] : en.teams;
      
      const email = userRecord?.email;
      if (!email) continue;

      rosterMap.set(email.toLowerCase(), {
        email: email,
        user_id: en.student_id,
        full_name: userRecord?.full_name ?? null,
        affiliation: (teamRecord?.country as TeamCountry) || null,
        interest_group: en.interest_block,
        status: "account_created",
        joined_at: en.joined_at,
      });
    }
  }

  // 2. Fetch invites and add any that aren't already enrolled
  const { data: invites, error: inviteError } = await supabase
    .from("class_invites")
    .select("email, affiliation, interest_block, status, invited_at")
    .eq("class_id", classId);

  if (inviteError) {
    console.error("Error fetching class invites:", inviteError);
  } else if (invites) {
    for (const invite of invites) {
      const lowerEmail = invite.email.toLowerCase();
      // Only add to roster if they haven't enrolled yet
      if (!rosterMap.has(lowerEmail)) {
        rosterMap.set(lowerEmail, {
          email: invite.email,
          full_name: null,
          affiliation: invite.affiliation as TeamCountry,
          interest_group: invite.interest_block,
          status: "pending",
          joined_at: null,
        });
      }
    }
  }

  return Array.from(rosterMap.values()).sort((a, b) => {
    // Sort by joined or invited time (newest first placeholder)
    return a.email.localeCompare(b.email);
  });
}

export async function enrollStudentByCode(classCode: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not logged in" };

  const { error } = await supabase.rpc("enroll_student", {
    p_class_code: classCode
  });

  if (error) {
    if (error.message.includes('already enrolled')) {
       return { error: "You are already enrolled in this class" };
    }
    if (error.message.includes('Invalid class code')) {
       return { error: "Invalid class code" };
    }
    return { error: "Failed to enroll" };
  }
  
  revalidatePath("/student/dashboard");
  return { success: true };
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
