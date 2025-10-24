// /home/dpwanjala/repositories/syncropel/studio/src/widgets/ActivityHubWidget/index.tsx
"use client";

import React from "react";
import { Tabs, Box, Text, Tooltip, ActionIcon } from "@mantine/core";
import {
  IconTerminal2,
  IconHistory,
  IconFileText,
  IconX,
} from "@tabler/icons-react";
import { useUIStateStore } from "@/shared/store/useUIStateStore";

// Import all the possible panel components
import TerminalTab from "./TerminalTab";
import RunsTab from "./RunsTab";
import RunInspectorTab from "./RunInspectorTab";

// For now, the old LogsTab can serve as our LogsTab. We can refine it later.
import LogsTab from "./LogsTab";

/**
 * A "smart" tab controller for the bottom Output Panel.
 * It dynamically renders tabs based on global state from useUIStateStore, creating
 * a context-aware and non-redundant user experience.
 */
export default function ActivityHubWidget() {
  const {
    outputPanelTabs,
    activeOutputPanelTab,
    setActiveOutputPanelTab,
    removeOutputPanelTab,
    addOutputPanelTab,
  } = useUIStateStore();

  // This function decides which component to render for a given tab ID.
  // It's the "router" for the output panel.
  const renderPanelContent = (tabId: string) => {
    if (tabId === "terminal") {
      return <TerminalTab />;
    }
    if (tabId === "runs") {
      return (
        <RunsTab
          // When a user clicks "Details" in the RunsTab, add a new inspector tab.
          onViewDetails={(runId) => addOutputPanelTab(`run-detail-${runId}`)}
          // When a user clicks "Logs", add a new, filtered logs tab.
          onFilterLogs={(filter) => addOutputPanelTab(`logs:${filter}`)}
        />
      );
    }
    if (tabId.startsWith("run-detail-")) {
      const runId = tabId.replace("run-detail-", "");
      return (
        <RunInspectorTab
          runId={runId}
          onFilterLogs={(filter) => addOutputPanelTab(`logs:${filter}`)}
        />
      );
    }
    if (tabId.startsWith("logs:")) {
      const filter = tabId.replace("logs:", "");
      // The old LogsTab can be repurposed as our new LogsTab.
      return <LogsTab filter={filter} />;
    }
    return (
      <Text p="md" c="dimmed">
        Unknown tab type: {tabId}
      </Text>
    );
  };

  // This function decides the icon and label for each tab.
  const getTabInfo = (tabId: string) => {
    if (tabId === "terminal") {
      return { icon: <IconTerminal2 size={14} />, label: "Terminal" };
    }
    if (tabId === "runs") {
      return { icon: <IconHistory size={14} />, label: "Runs" };
    }
    if (tabId.startsWith("run-detail-")) {
      const shortId = tabId.slice(-6);
      return { icon: <IconHistory size={14} />, label: `Run: ...${shortId}` };
    }
    if (tabId.startsWith("logs:")) {
      return { icon: <IconFileText size={14} />, label: "Logs" };
    }
    return { icon: <IconFileText size={14} />, label: "Unknown" };
  };

  return (
    <Box className="h-full w-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <Tabs
        value={activeOutputPanelTab}
        onChange={(value) => setActiveOutputPanelTab(value)}
        className="flex flex-col flex-grow h-full"
      >
        <Tabs.List>
          {/* Dynamically render the list of tabs from the global store */}
          {outputPanelTabs.map((tabId) => {
            const { icon, label } = getTabInfo(tabId);
            return (
              <Tabs.Tab
                key={tabId}
                value={tabId}
                leftSection={icon}
                // The Terminal tab is permanent; all others are closable.
                rightSection={
                  tabId !== "terminal" ? (
                    <Tooltip
                      label="Close Tab"
                      position="top"
                      withArrow
                      openDelay={500}
                    >
                      <ActionIcon
                        size="xs"
                        variant="transparent"
                        onMouseDown={(e) => e.stopPropagation()} // Prevent the tab from gaining focus
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent the tab's onChange from firing
                          removeOutputPanelTab(tabId);
                        }}
                        aria-label={`Close tab ${label}`}
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    </Tooltip>
                  ) : null
                }
              >
                <Text size="xs">{label}</Text>
              </Tabs.Tab>
            );
          })}
        </Tabs.List>

        {/* Dynamically render the content panel for each tab */}
        {outputPanelTabs.map((tabId) => (
          <Tabs.Panel
            key={tabId}
            value={tabId}
            className="flex-grow overflow-auto"
          >
            {renderPanelContent(tabId)}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Box>
  );
}
