import { NavUser } from "@/components/nav-user";
import { requireUser } from "@/lib/auth/dal";

export async function SidebarUser() {
  const user = await requireUser();
  return <NavUser username={user.username} />;
}
