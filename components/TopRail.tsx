import { OrgSwitcher } from "@/components/OrgSwitcher";
import { SignOutButton } from "@/components/SignOutButton";
import { createClient } from "@/lib/supabase/server";

export async function TopRail() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between border-b border-ink-2 px-6 py-4">
      <span className="text-sm font-medium text-ink-4">AI HQ</span>
      <div className="flex items-center gap-4">
        <OrgSwitcher />
        <span className="text-sm text-ink-3">{user?.email}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
