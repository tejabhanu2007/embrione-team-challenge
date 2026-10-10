import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Return only fields intended for public display. Never send email addresses or SRNs here.
export async function GET() {
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("members")
      .select("id,name,domain,position,branch,semester,bio,photo_url,linkedin_url,github_url,status,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ members: data ?? [] });
  } catch (error) {
    console.error("Public team fetch failed:", error);
    return NextResponse.json({ error: "Could not load the team directory." }, { status: 500 });
  }
}
