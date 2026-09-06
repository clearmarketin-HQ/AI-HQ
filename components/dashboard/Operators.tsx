import { Panel } from "./Panel";
import { Avatar, Divider, Dot } from "./primitives";

export function Operators() {
  return (
    <Panel
      title="Operators"
      icon={
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-[15px] w-[15px] flex-shrink-0 text-accent"
        >
          <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M4 17c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      }
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar initials="AP" />
          <div className="flex flex-col gap-px">
            <span className="text-[12.5px] font-semibold">Alem Peljto</span>
            <span className="text-[10.5px] text-ink-3">Operator 1</span>
          </div>
        </div>
        <span className="flex items-center gap-1.5">
          <Dot className="bg-ok" />
          <span className="text-[11px] text-ink-3">Active</span>
        </span>
      </div>
      <Divider />
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar initials="WA" />
          <div className="flex flex-col gap-px">
            <span className="text-[12.5px] font-semibold">Wascar Aracena</span>
            <span className="text-[10.5px] text-ink-3">Operator 2</span>
          </div>
        </div>
        <span className="flex items-center gap-1.5">
          <Dot className="bg-ink-3" />
          <span className="text-[11px] text-ink-3">Available</span>
        </span>
      </div>
      <div className="font-mono text-[11px] text-ink-3">
        Last capture · 2 min ago
      </div>
    </Panel>
  );
}
