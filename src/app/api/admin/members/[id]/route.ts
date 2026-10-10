import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Please log in as admin." }, { status: 401 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (body.status !== "approved" && body.status !== "rejected") {
    return NextResponse.json({ error: "Status must be approved or rejected." }, { status: 400 });
  }

  const { id } = await context.params;
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("members")
      .update({ status: body.status })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ member: data });
  } catch (error) {
    console.error("Member moderation failed:", error);
    return NextResponse.json({ error: "Could not update this member." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Please log in as admin." }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Member delete failed:", error);
    return NextResponse.json({ error: "Could not delete this member." }, { status: 500 });
  }
}
