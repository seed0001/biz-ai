import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { decrypt, getSessionCookie } from "./session";
import { prisma } from "./prisma";

// Verifies the session cookie once per request (React's cache dedupes
// repeated calls during a single render pass) and redirects unauthenticated
// requests to /login — the single choke point every server data access and
// Server Action should go through before touching the database.
export const verifySession = cache(async () => {
  const cookie = await getSessionCookie();
  const session = await decrypt(cookie);

  if (!session?.userId || !session?.tenantId) {
    redirect("/login");
  }

  return { userId: session.userId, tenantId: session.tenantId };
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.tenantId !== session.tenantId) {
    redirect("/login");
  }
  return user;
});
