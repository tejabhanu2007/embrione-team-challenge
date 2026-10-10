import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const srn = (searchParams.get("srn") ?? "").trim().toUpperCase();
  if (!srn || srn.length > 50) {
    return NextResponse.json({ error: "Enter a valid SRN." }, { status: 400 });
  }

  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase.from("members").select("id").eq("srn", srn).limit(1);
    if (error) throw error;
    return NextResponse.json({ exists: Boolean(data?.length) });
  } catch (error) {
    console.error("SRN check failed:", error);
    return NextResponse.json({ error: "Could not check SRN right now." }, { status: 500 });
  }
}
