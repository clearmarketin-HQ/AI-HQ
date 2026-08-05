import { Shell } from "@/components/Shell";
import { TopRail } from "@/components/TopRail";
import { DashboardBody } from "@/components/DashboardBody";

export default function Home() {
  return (
    <Shell>
      <TopRail />
      <DashboardBody />
    </Shell>
  );
}
