"use client";

import { Shell } from "@/components/Shell";
import { TopRail } from "@/components/TopRail";
import { useOrg } from "@/lib/org/OrgContext";

export default function Home() {
  const { org } = useOrg();

  return (
    <Shell>
      <TopRail />
      <main className="flex flex-1 flex-col gap-6 px-6 py-8">
        <h1 className="text-xl font-semibold text-ink-4">{org.name}</h1>
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-ink-2 text-ink-3">
          <p className="text-sm">Coming soon</p>
        </div>
      </main>
    </Shell>
  );
}
