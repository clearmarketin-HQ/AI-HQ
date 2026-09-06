import { Panel } from "./Panel";
import { Divider, Tag } from "./primitives";

const STAGES: { label: string; count: string; ok?: boolean }[] = [
  { label: "New", count: "12" },
  { label: "Qualified", count: "7" },
  { label: "Proposal", count: "4" },
  { label: "Won", count: "2", ok: true },
];

const DEALS: { title: string; org: string; amount: string; stage: string }[] = [
  { title: "Riverside HOA contract", org: "Goldys Maids", amount: "$4,200/mo", stage: "Proposal" },
  { title: "Senior DevOps placement", org: "Top Player Placement", amount: "$18,000 fee", stage: "Qualified" },
];

export function Pipeline() {
  return (
    <Panel
      title="Pipeline"
      icon={
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-[15px] w-[15px] flex-shrink-0 text-accent"
        >
          <path
            d="M3 4h14l-5.5 7v5l-3 1.5v-6.5L3 4z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      }
    >
      <div className="flex items-center justify-between py-0.5">
        {STAGES.map((stage) => (
          <div key={stage.label} className="flex flex-col items-center gap-0.5">
            <span
              className={`font-mono text-[17px] font-semibold ${
                stage.ok ? "text-ok" : ""
              }`}
            >
              {stage.count}
            </span>
            <span className="text-[10.5px] text-ink-3">{stage.label}</span>
          </div>
        ))}
      </div>
      <Divider />
      <div className="flex flex-col gap-2.5">
        {DEALS.map((deal) => (
          <div key={deal.title} className="flex items-center justify-between gap-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[12.5px]">{deal.title}</span>
              <Tag>{deal.org}</Tag>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-mono text-[12.5px]">{deal.amount}</span>
              <span className="text-[10.5px] text-ink-3">{deal.stage}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
