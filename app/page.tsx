import { Shell } from "@/components/Shell";
import { TopRail } from "@/components/TopRail";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { CaptureBox } from "@/components/dashboard/CaptureBox";
import { Operators } from "@/components/dashboard/Operators";
import { FinancePulse } from "@/components/dashboard/FinancePulse";
import { KeyBlockers } from "@/components/dashboard/KeyBlockers";
import { Session } from "@/components/dashboard/Session";
import { Pipeline } from "@/components/dashboard/Pipeline";
import { Priorities } from "@/components/dashboard/Priorities";
import { Calendar } from "@/components/dashboard/Calendar";
import { MarketingPulse } from "@/components/dashboard/MarketingPulse";

export default function Home() {
  return (
    <Shell>
      <TopRail />
      <DashboardGrid
        left={
          <>
            <Operators />
            <FinancePulse />
            <KeyBlockers />
          </>
        }
        center={
          <>
            <Session />
            <Pipeline />
            <Priorities />
          </>
        }
        right={
          <>
            <Calendar />
            <MarketingPulse />
          </>
        }
      />
      <CaptureBox />
    </Shell>
  );
}
