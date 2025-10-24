// /src/widgets/SidebarPanel/index.tsx
"use client";

import { Box, ScrollArea } from "@mantine/core";
import { useUIStateStore } from "@/shared/store/useUIStateStore";
import ExplorerView from "@/widgets/ExplorerView";
import HistoryView from "@/widgets/HistoryView";
import SettingsView from "@/widgets/SettingsView";
import ConnectionStatus from "@/widgets/SidebarWidget/ConnectionStatus"; // We can reuse this
import EcosystemView from "../EcosystemView";
import GlobalView from "../GlobalView";

export default function SidebarPanel() {
  const { activeSidebarView, toggleConnectionManager } = useUIStateStore();

  const renderView = () => {
    switch (activeSidebarView) {
      case "ecosystem":
        return <EcosystemView />;
      case "history":
        return <HistoryView />;
      case "global":
        return <GlobalView />;
      case "explorer":
      default:
        return <ExplorerView />;
    }
  };

  return (
    <Box className="h-full w-full flex flex-col flex-1 min-w-0">
      <ScrollArea className="flex-grow">{renderView()}</ScrollArea>
      <ConnectionStatus onClick={() => toggleConnectionManager(true)} />
    </Box>
  );
}
