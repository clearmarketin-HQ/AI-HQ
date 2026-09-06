import { OrgSwitcher } from "@/components/OrgSwitcher";
import { SignOutButton } from "@/components/SignOutButton";
import { TopRailClock } from "@/components/TopRailClock";
import { createClient } from "@/lib/supabase/server";

const TABS = ["Home", "CRM", "Brain", "Finance", "Marketing", "Calendar"];

export async function TopRail() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="relative flex flex-wrap items-center justify-between gap-6 border-b border-ink-2/50 px-6 py-3.5">
      <div className="flex flex-shrink-0 items-center gap-4">
        <span className="text-[15px] font-semibold tracking-tight text-ink-4">
          AI HQ
        </span>
        <OrgSwitcher />
      </div>

      <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-[22px] md:flex">
        {TABS.map((tab) => (
          <span
            key={tab}
            className={
              tab === "Home"
                ? "border-b-2 border-accent pb-1 text-[13px] text-ink-4"
                : "border-b-2 border-transparent pb-1 text-[13px] text-ink-3"
            }
          >
            {tab}
          </span>
        ))}
      </nav>

      <div className="flex flex-shrink-0 items-center gap-3.5">
        <TopRailClock />
        <span className="text-sm text-ink-3">{user?.email}</span>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/[0.18] text-xs font-semibold text-accent">
          {getInitials(user?.email)}
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}

function getInitials(email?: string | null): string {
  if (!email) {
    return "?";
  }

  const name = email.split("@")[0];
  const parts = name.split(/[._-]/).filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}
