import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_MAX_AGE, createAdminToken } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) {
    return NextResponse.json({ error: "Admin credentials are not configured on the server." }, { status: 500 });
  }

  if (body.email?.trim().toLowerCase() !== expectedEmail.toLowerCase() || body.password !== expectedPassword) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  try {
    const token = await createAdminToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error("Admin session creation failed:", error);
    return NextResponse.json({ error: "Could not start admin session. Check ADMIN_SESSION_SECRET." }, { status: 500 });
  }
}
