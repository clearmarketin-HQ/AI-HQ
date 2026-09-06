"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Org } from "./types";

export const ALL_ORGS_ID = "__all__";
const ALL_ORGS_OPTION: Org = { id: ALL_ORGS_ID, name: "All Businesses" };

interface OrgContextValue {
  org: Org | undefined;
  orgs: Org[];
  setOrgId: (id: string) => void;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({
  orgs,
  children,
}: {
  orgs: Org[];
  children: ReactNode;
}) {
  const allOrgs = useMemo(() => [ALL_ORGS_OPTION, ...orgs], [orgs]);
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? ALL_ORGS_ID);

  const value = useMemo<OrgContextValue>(() => {
    const org = allOrgs.find((o) => o.id === orgId) ?? allOrgs[0];
    return { org, orgs: allOrgs, setOrgId };
  }, [orgId, allOrgs]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return ctx;
}
