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
import RunsTab from "./RunsTab";
import RunInspectorTab from "./RunInspectorTab";
import LogsTab from "./LogsTab";
import TerminalView from "../OutputPanel/TerminalView";

/**
 * A "smart" tab controller for the bottom Output Panel.
 * It dynamically renders tabs based on global state from useUIStateStore, creating
 * a context-aware and non-redundant user experience with a permanent "Terminal"
 * tab and dynamic, closable tabs for other contexts.
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
    // The 'terminal' tab is now the permanent home for our unified view.
    if (tabId === "terminal") {
      return <TerminalView />;
    }
    if (tabId === "runs") {
      return (
        <RunsTab
          onViewDetails={(runId) => addOutputPanelTab(`run-detail-${runId}`)}
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
      return <LogsTab filter={filter} />;
    }
    // Fallback for any unknown tab type
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
                        onMouseDown={(e) => e.stopPropagation()} // Prevents tab from gaining focus on middle-click
                        onClick={(e) => {
                          e.stopPropagation(); // Prevents the tab's onChange from firing
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
