import type { ReactNode } from "react";

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="w-fit whitespace-nowrap rounded-full border border-ink-2/70 px-2 py-[3px] text-[10.5px] leading-none text-ink-3">
      {children}
    </span>
  );
}

export function Dot({ className = "" }: { className?: string }) {
  return (
    <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${className}`} />
  );
}

export function Divider() {
  return <hr className="my-0.5 h-px border-none bg-ink-2/45" />;
}

export function Avatar({
  initials,
  size = 34,
}: {
  initials: string;
  size?: number;
}) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/[0.18] text-xs font-semibold text-accent"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}
