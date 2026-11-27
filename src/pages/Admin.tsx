import { useState } from "react";
import {
  LayoutDashboard,
  MapPin,
  Route,
  Bus,
  UserRound,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { StopsTab } from "@/components/admin/StopsTab";
import { RoutesTab } from "@/components/admin/RoutesTab";
import { BusesTab } from "@/components/admin/BusesTab";
import { DriversTab } from "@/components/admin/DriversTab";

const TABS = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "stops", label: "Stops", icon: MapPin },
  { value: "routes", label: "Routes", icon: Route },
  { value: "buses", label: "Shuttles", icon: Bus },
  { value: "drivers", label: "People", icon: UserRound },
];

export default function Admin() {
  const [tab, setTab] = useState("overview");

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList className="h-auto w-full justify-start gap-1 rounded-2xl border border-border/60 bg-card p-1.5 sm:w-auto">
        {TABS.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className="gap-1.5 rounded-xl px-3 py-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:text-sm"
          >
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab onGo={setTab} />
      </TabsContent>
      <TabsContent value="stops">
        <StopsTab />
      </TabsContent>
      <TabsContent value="routes">
        <RoutesTab />
      </TabsContent>
      <TabsContent value="buses">
        <BusesTab />
      </TabsContent>
      <TabsContent value="drivers">
        <DriversTab />
      </TabsContent>
    </Tabs>
  );
}
