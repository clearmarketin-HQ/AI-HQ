import { OrgSwitcher } from "@/components/OrgSwitcher";

export function TopRail() {
  return (
    <header className="flex items-center justify-between border-b border-ink-2 px-6 py-4">
      <span className="text-sm font-medium text-ink-4">AI HQ</span>
      <OrgSwitcher />
    </header>
  );
}
