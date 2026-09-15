import { cookies } from "next/headers";
import { verifyAdminToken, COOKIE_NAME } from "./admin-auth";

export async function requireAdmin() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  const user = await verifyAdminToken(token);

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}
