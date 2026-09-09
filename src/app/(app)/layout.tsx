import { getCurrentUser } from "@/lib/dal";
import { getTenantSnapshot } from "@/lib/tenant-data";
import { AppProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

// verifySession() (called inside getCurrentUser) redirects to /login before
// any of this runs if there's no valid session — this layout only ever
// renders for an authenticated request.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const initialData = await getTenantSnapshot(user.tenantId);

  return (
    <AppProvider initialData={initialData} currentUserId={user.id}>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
