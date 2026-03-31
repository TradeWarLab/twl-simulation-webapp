import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load .env.local to get live credentials for the healthcheck test
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

/**
 * These tests hit the real configured Supabase database to verify major 
 * pain points like fundamental schema permissions and database health.
 * 
 * Note: the "@supabase/supabase-js" client is used directly here to bypass 
 * Vitest mocks set up in `__tests__/setup.ts` for the internal Next.js client.
 */
describe("Database Health & Permissions", () => {
  it("anon role should have USAGE privilege on the public schema without 'permission denied' errors", async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn("Skipping healthcheck test: Missing Supabase credentials in .env.local");
      return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Attempt basic query to verify connection and schema privileges
    const { error } = await supabase.from("classes").select("id").limit(0);

    // The error code 42501 means insufficient privilege! 
    // This happens if the user lacks USAGE on the schema OR SELECT on the specific table.
    if (error) {
       console.error("Healthcheck DB Error:", error);

       expect(
         error.code === '42501', 
         `Missing privileges! Run the SQL fix script. Detailed error: ${error.message}`
       ).toBe(false); 
    } else {
      expect(error).toBeNull();
    }
  });
});
