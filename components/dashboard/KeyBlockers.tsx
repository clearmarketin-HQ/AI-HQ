import { Panel } from "./Panel";
import { Dot, Tag } from "./primitives";

const BLOCKERS: { text: string; org: string; color: "danger" | "warn" }[] = [
  { text: "Permit inspection overdue 3 days", org: "OpenForge", color: "danger" },
  { text: "I-130 documents missing from client", org: "CENA Immigration", color: "warn" },
  { text: "Retainer invoice unpaid 15 days", org: "VES Law", color: "warn" },
];

export function KeyBlockers() {
  return (
    <Panel
      title="Key Blockers"
      icon={
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-[15px] w-[15px] flex-shrink-0 text-danger"
        >
          <path
            d="M10 2.5l8 14.5H2l8-14.5z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M10 8v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="10" cy="14" r="0.9" fill="currentColor" />
        </svg>
      }
    >
      <div className="flex flex-col gap-2.5">
        {BLOCKERS.map((blocker) => (
          <div key={blocker.text} className="flex items-start gap-2">
            <Dot className={`mt-1.5 ${blocker.color === "danger" ? "bg-danger" : "bg-warn"}`} />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs leading-snug">{blocker.text}</span>
              <Tag>{blocker.org}</Tag>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
