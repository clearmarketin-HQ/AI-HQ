"use client";

import { useOrg } from "@/lib/org/OrgContext";

export function OrgSwitcher() {
  const { org, orgs, setOrgId } = useOrg();

  if (!org) {
    return <span className="text-sm text-ink-3">No organizations</span>;
  }

  return (
    <select
      value={org.id}
      onChange={(e) => setOrgId(e.target.value)}
      className="rounded-md border border-ink-2 bg-ink-1 px-3 py-1.5 text-sm text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent"
      aria-label="Select organization"
    >
      {orgs.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
