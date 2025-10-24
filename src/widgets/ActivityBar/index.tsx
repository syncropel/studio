// /home/dpwanjala/repositories/syncropel/studio/src/widgets/ActivityBar/index.tsx
"use client";

import React from "react";
import { Stack, ActionIcon, Tooltip } from "@mantine/core";
import {
  IconFiles,
  IconCube,
  IconHistory,
  IconSettings,
  IconGlobe,
} from "@tabler/icons-react";
import { useUIStateStore, SidebarView } from "@/shared/store/useUIStateStore";
import { useSettingsStore } from "@/shared/store/useSettingsStore";

/**
 * A reusable button component specifically for the Activity Bar.
 * It's aware of the active view and styles itself accordingly.
 */
const ActivityBarButton = ({
  label,
  icon: Icon,
  view,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  view: SidebarView;
  onClick: (view: SidebarView) => void;
}) => {
  const activeSidebarView = useUIStateStore((state) => state.activeSidebarView);
  const isActive = activeSidebarView === view;

  return (
    <Tooltip label={label} position="right" withArrow openDelay={500}>
      <ActionIcon
        size="lg" // Standardized size for a cleaner look
        variant={isActive ? "light" : "transparent"}
        color={isActive ? "blue" : "gray"}
        onClick={() => onClick(view)}
        aria-label={label}
      >
        <Icon stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  );
};

/**
 * The main Activity Bar component. It acts as a primary navigation rail for the
 * entire application, allowing users to switch between major sidebar views
 * and access global actions.
 */
export default function ActivityBar() {
  const { setActiveSidebarView, addOutputPanelTab, toggleConnectionManager } =
    useUIStateStore();
  const { toggleTerminal } = useSettingsStore();

  // Handler for buttons that simply change the sidebar view.
  const handleViewChange = (view: SidebarView) => {
    setActiveSidebarView(view);
  };

  // Handler for the "History" button, which is a pure action.
  const handleHistoryClick = () => {
    // 1. Ensure the bottom panel is visible.
    toggleTerminal(true);
    // 2. Add the 'runs' tab to the Output Panel.
    addOutputPanelTab("runs");
  };

  return (
    <Stack
      justify="space-between"
      align="center"
      className="h-full w-12 py-2 px-1 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
    >
      {/* Top section with primary view-switching icons */}
      <Stack gap="sm">
        <ActivityBarButton
          label="Explorer"
          icon={IconFiles}
          view="explorer"
          onClick={handleViewChange}
        />
        <ActivityBarButton
          label="Global"
          icon={IconGlobe}
          view="global"
          onClick={handleViewChange}
        />
        <ActivityBarButton
          label="Ecosystem"
          icon={IconCube}
          view="ecosystem"
          onClick={handleViewChange}
        />
        <Tooltip label="Run History" position="right" withArrow openDelay={500}>
          <ActionIcon
            size="lg"
            variant="transparent"
            color="gray"
            onClick={handleHistoryClick}
            aria-label="Run History"
          >
            <IconHistory stroke={1.5} />
          </ActionIcon>
        </Tooltip>
      </Stack>

      {/* Bottom section with persistent global action icons */}
      <Stack>
        <Tooltip
          label="Manage Connections"
          position="right"
          withArrow
          openDelay={500}
        >
          <ActionIcon
            variant="transparent"
            color="gray"
            size="lg"
            onClick={() => toggleConnectionManager(true)}
            aria-label="Manage Connections"
          >
            <IconSettings stroke={1.5} />
          </ActionIcon>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
