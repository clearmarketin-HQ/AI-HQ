import type { ReactNode } from "react";

export function DashboardGrid({
  left,
  center,
  right,
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="grid flex-1 items-start gap-5 px-6 pb-36 pt-5 md:grid-cols-[280px_minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-[18px]">{left}</div>
      <div className="flex flex-col gap-[18px]">{center}</div>
      <div className="flex flex-col gap-[18px]">{right}</div>
    </div>
  );
}
