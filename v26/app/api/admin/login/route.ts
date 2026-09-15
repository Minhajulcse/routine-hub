import { NextResponse } from "next/server";
import { createAdminToken, COOKIE_NAME, verifyPassword } from "../../../../lib/admin-auth";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email || "");
  const password = String(body.password || "");

  if (email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (!(await verifyPassword(password))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await createAdminToken(email);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/"
  });
  return response;
}
