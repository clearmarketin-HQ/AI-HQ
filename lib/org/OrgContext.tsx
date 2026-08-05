"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Org } from "./types";

interface OrgContextValue {
  org: Org;
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
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? "");

  const value = useMemo<OrgContextValue>(() => {
    const org = orgs.find((o) => o.id === orgId) ?? orgs[0];
    return { org, orgs, setOrgId };
  }, [orgId, orgs]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return ctx;
}
