import { Panel } from "./Panel";
import { Divider, Tag } from "./primitives";

const ITEMS: { text: string; org: string; badge: string; tone: "danger" | "warn" }[] = [
  { text: "Call roofer re: Elm St project", org: "OpenForge", badge: "Today", tone: "danger" },
  { text: "Send retainer invoice reminder", org: "VES Law Group", badge: "Today", tone: "danger" },
  { text: "Approve TikTok ad creative batch", org: "ProfitShield AI", badge: "This Week", tone: "warn" },
];

export function Session() {
  return (
    <Panel
      title="Session · Today's Top 3"
      icon={
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-[15px] w-[15px] flex-shrink-0 text-accent"
        >
          <circle cx="10" cy="10" r="7.2" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10 6v4l3 2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      }
    >
      <div className="flex flex-col gap-2.5">
        {ITEMS.map((item, i) => (
          <div key={item.text}>
            {i > 0 && <Divider />}
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[13px]">{item.text}</span>
                <Tag>{item.org}</Tag>
              </div>
              <span
                className={`w-fit whitespace-nowrap rounded-md px-[7px] py-0.5 text-[10px] font-semibold tracking-[0.02em] ${
                  item.tone === "danger"
                    ? "bg-danger/[0.16] text-danger"
                    : "bg-warn/[0.16] text-warn"
                }`}
              >
                {item.badge}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
