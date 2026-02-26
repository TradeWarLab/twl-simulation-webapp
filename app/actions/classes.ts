"use server";

import { createClient } from "@/lib/supabase/server";
import {
  type ClassInviteRow,
  type ClassRosterEntry,
  type ClassSummary,
  type StudentClassJoinRow,
  type StudentClassSummary,
  type TeamCountry,
} from "@/lib/types/domain";
import { revalidatePath } from "next/cache";

const VALID_AFFILIATIONS: readonly TeamCountry[] = ["USA", "China"];

function isValidAffiliation(value: string): value is TeamCountry {
  return VALID_AFFILIATIONS.includes(value as TeamCountry);
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

export async function inviteStudentToClass(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const classId = String(formData.get("class_id") ?? "").trim();
  const rawEmail = String(formData.get("email") ?? "").trim();
  const affiliation = String(formData.get("affiliation") ?? "").trim();
  const rawInterestBlock = String(formData.get("interest_block") ?? "").trim();

  const email = rawEmail.toLowerCase();
  const interestBlock = rawInterestBlock.length > 0 ? rawInterestBlock : null;

  if (!classId || !email || !isValidAffiliation(affiliation)) {
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

  const { data: invites, error: inviteError } = await supabase
    .from("class_invites")
    .select("email, affiliation, interest_block, status, invited_at")
    .eq("class_id", classId)
    .order("invited_at", { ascending: false });

  if (inviteError || !invites) {
    if (inviteError) {
      console.error("Error fetching class invites:", inviteError);
    }
    return [];
  }

  const typedInvites = invites as ClassInviteRow[];
  if (typedInvites.length === 0) {
    return [];
  }

  const emails = typedInvites.map((invite) => invite.email);

  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, email, full_name")
    .in("email", emails);

  if (userError) {
    console.error("Error fetching invited users:", userError);
    return typedInvites.map((invite) => ({
      email: invite.email,
      full_name: null,
      affiliation: invite.affiliation,
      interest_group: invite.interest_block,
      status: "pending",
    }));
  }

  const usersByEmail = new Map(
    (users ?? []).map((entry) => [entry.email?.toLowerCase(), entry] as const),
  );

  const userIds = (users ?? []).map((entry) => entry.id);

  const enrollmentByUserId = new Map<
    string,
    { team_country: TeamCountry | null; interest_block: string | null }
  >();

  if (userIds.length > 0) {
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("students_classes")
      .select(
        `
          student_id,
          interest_block,
          teams (
            country
          )
        `,
      )
      .eq("class_id", classId)
      .in("student_id", userIds);

    if (enrollmentError) {
      console.error("Error fetching enrollments for roster:", enrollmentError);
    } else {
      for (const enrollment of enrollments ?? []) {
        const teamRecord = Array.isArray(enrollment.teams)
          ? enrollment.teams[0]
          : enrollment.teams;

        enrollmentByUserId.set(enrollment.student_id as string, {
          team_country: (teamRecord?.country as TeamCountry | undefined) ?? null,
          interest_block: (enrollment.interest_block as string | null) ?? null,
        });
      }
    }
  }

  return typedInvites.map((invite) => {
    const matchedUser = usersByEmail.get(invite.email.toLowerCase());
    const enrollment = matchedUser
      ? enrollmentByUserId.get(matchedUser.id)
      : undefined;

    return {
      email: invite.email,
      full_name: matchedUser?.full_name ?? null,
      affiliation: enrollment?.team_country ?? invite.affiliation,
      interest_group: enrollment?.interest_block ?? invite.interest_block,
      status: matchedUser ? "account_created" : "pending",
    };
  });
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
