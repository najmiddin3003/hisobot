import { NavUser } from "@/components/nav-user";
import { requireUser } from "@/lib/auth/dal";

export async function UserMenu() {
  const user = await requireUser();
  return <NavUser username={user.username} />;
}
