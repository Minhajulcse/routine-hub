import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "routine_admin";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "CHANGE_ME_IN_PRODUCTION"
);

export { COOKIE_NAME };

export async function verifyPassword(password: string) {
  const configured = process.env.ADMIN_PASSWORD || "";
  if (!configured) return false;

  // Supports either a bcrypt hash or a development plain password.
  if (configured.startsWith("$2")) return bcrypt.compare(password, configured);
  return password === configured;
}

export async function createAdminToken(email: string) {
  return new SignJWT({ email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function verifyAdminToken(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "admin" ? payload : null;
  } catch {
    return null;
  }
}
