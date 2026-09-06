import { Panel } from "./Panel";
import { Divider } from "./primitives";

const ROWS: { name: string; amount: string; change: string; up: boolean }[] = [
  { name: "OpenForge Construction", amount: "$62,400", change: "+4.2%", up: true },
  { name: "VES Law Group", amount: "$41,150", change: "+1.1%", up: true },
  { name: "Goldys Maids", amount: "$18,760", change: "-2.4%", up: false },
  { name: "Clear Market-In", amount: "$21,920", change: "+6.8%", up: true },
];

export function FinancePulse() {
  return (
    <Panel
      title="Finance Pulse"
      icon={
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-[15px] w-[15px] flex-shrink-0 text-ok"
        >
          <path
            d="M10 3v14M14 6.5c0-1.7-1.8-2.8-4-2.8s-4 1.1-4 2.8 1.8 2.5 4 2.8c2.2.3 4 1.1 4 2.8s-1.8 2.8-4 2.8-4-1.1-4-2.8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      }
    >
      <div>
        <div className="font-mono text-2xl font-semibold">$184,230</div>
        <div className="text-[11px] text-ink-3">Cash across businesses</div>
      </div>
      <Divider />
      <div className="flex flex-col gap-2">
        {ROWS.map((row) => (
          <div key={row.name} className="flex items-center justify-between gap-2.5">
            <span className="text-xs">{row.name}</span>
            <span className="flex items-center gap-1.5">
              <span className="font-mono text-xs">{row.amount}</span>
              <span
                className={`font-mono text-[10.5px] ${
                  row.up ? "text-ok" : "text-danger"
                }`}
              >
                {row.change}
              </span>
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
