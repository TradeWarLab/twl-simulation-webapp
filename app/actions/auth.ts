"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Check user role to redirect appropriately
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (profile?.role === "instructor") {
      redirect("/instructor/dashboard");
    } else {
      redirect("/student/dashboard");
    }
  }

  redirect("/protected");
}

export async function signUp(formData: FormData) {
  const origin = (await headers()).get("origin");
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const full_name = formData.get("full_name") as string;
  const role = formData.get("role") as string || "student"; // Default to student

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        role,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is disabled, the user is signed in immediately
  if (data.session) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user?.id)
      .single();
    
    if (profile?.role === "instructor") {
      redirect("/instructor/dashboard");
    } else {
      redirect("/student/dashboard");
    }
  }

  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
