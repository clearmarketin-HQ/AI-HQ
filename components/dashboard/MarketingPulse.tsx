import { Panel } from "./Panel";
import { Divider } from "./primitives";

const CHANNELS = [
  { name: "Google Ads", spend: "$1,240", conv: "38 conv" },
  { name: "Meta", spend: "$860", conv: "21 conv" },
  { name: "TikTok", spend: "$310", conv: "6 conv" },
];

export function MarketingPulse() {
  return (
    <Panel
      title="Marketing Pulse"
      icon={
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-[15px] w-[15px] flex-shrink-0 text-accent"
        >
          <path
            d="M3 9v2l3 .6v3.4a1.5 1.5 0 003 0v-2.8l7 1.4V6L9 7.4 6 8l-3 1z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      }
    >
      <div className="flex flex-col gap-2">
        {CHANNELS.map((channel) => (
          <div key={channel.name} className="flex items-center justify-between gap-2.5">
            <span className="text-[12.5px]">{channel.name}</span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs">{channel.spend}</span>
              <span className="font-mono text-[11px] text-ink-3">{channel.conv}</span>
            </span>
          </div>
        ))}
      </div>
      <Divider />
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-[11.5px] text-ink-3">Total</span>
        <span className="font-mono text-[12.5px] font-semibold">
          $2,410 · 65 conv
        </span>
      </div>
    </Panel>
  );
}
