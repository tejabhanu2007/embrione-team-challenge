import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Please log in as admin." }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ members: data ?? [] });
  } catch (error) {
    console.error("Admin member fetch failed:", error);
    return NextResponse.json({ error: "Could not load submissions." }, { status: 500 });
  }
}
