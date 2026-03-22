import { cookies } from "next/headers";
import { createId } from "@paralleldrive/cuid2";

const COOKIE_NAME = "anon-session";
const MAX_AGE = 604800; // 7 days in seconds
const IS_PRODUCTION = process.env.NODE_ENV === "production";

export async function getAnonSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export function setAnonSessionCookie(
  response: Response,
  value?: string
): string {
  const id = value ?? createId();
  const secure = IS_PRODUCTION ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${id}; HttpOnly${secure}; SameSite=Lax; Max-Age=${MAX_AGE}; Path=/`
  );
  return id;
}
