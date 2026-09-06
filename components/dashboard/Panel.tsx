import type { ReactNode } from "react";

export function Panel({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-[14px] border border-ink-2/55 bg-ink-1/55 px-[18px] py-4 shadow-[0_14px_32px_-18px_oklch(0.05_0_0_/_0.75)] backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
