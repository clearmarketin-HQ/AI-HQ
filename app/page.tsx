import { OrgSwitcher } from "@/components/OrgSwitcher";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-ink-2 px-6 py-4">
        <span className="text-sm font-medium text-ink-4">AI HQ</span>
        <OrgSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center text-ink-3">
        <p className="text-sm">Nothing here yet.</p>
      </main>
    </div>
  );
}
