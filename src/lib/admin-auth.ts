import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE_NAME = "embrione_admin_session";
const SESSION_LENGTH_SECONDS = 60 * 60 * 8;

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be set and contain at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminToken() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_LENGTH_SECONDS}s`)
    .sign(getSecret());
}

export async function hasAdminSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) return false;
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export const ADMIN_SESSION_MAX_AGE = SESSION_LENGTH_SECONDS;
