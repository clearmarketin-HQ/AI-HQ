import { Panel } from "./Panel";
import { Tag } from "./primitives";

const EVENTS = [
  { time: "09:00", text: "Site walkthrough", org: "OpenForge" },
  { time: "11:30", text: "Client call", org: "VES Law" },
  { time: "14:00", text: "Team sync", org: "All" },
  { time: "Thu 10:00", text: "Filing review", org: "CENA Immigration" },
];

export function Calendar() {
  return (
    <Panel
      title="Calendar"
      icon={
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-[15px] w-[15px] flex-shrink-0 text-accent"
        >
          <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M3 8h14M6.5 3v3M13.5 3v3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      }
    >
      <div className="flex flex-col gap-2.5">
        {EVENTS.map((event) => (
          <div key={event.text} className="flex items-start gap-2.5">
            <span className="w-14 flex-shrink-0 font-mono text-[11.5px] text-ink-3">
              {event.time}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[12.5px]">{event.text}</span>
              <Tag>{event.org}</Tag>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
