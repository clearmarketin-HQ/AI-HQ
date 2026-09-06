import { Panel } from "./Panel";

const PRIORITIES = [
  "Close Riverside HOA deal · Goldys Maids",
  "Unblock OpenForge permit inspection",
  "Clear CENA intake backlog (6 cases)",
  "Review ProfitShield Q3 ad spend",
];

export function Priorities() {
  return (
    <Panel
      title="Priorities"
      icon={
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-[15px] w-[15px] flex-shrink-0 text-accent"
        >
          <path
            d="M5 3v14M5 3.8h9l-2.2 3 2.2 3H5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      }
    >
      <div className="flex flex-col gap-2">
        {PRIORITIES.map((text, i) => (
          <div key={text} className="flex items-center gap-2.5">
            <span className="w-3.5 font-mono text-[11.5px] text-accent">{i + 1}</span>
            <span className="text-[12.5px]">{text}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
