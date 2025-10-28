// /home/dpwanjala/repositories/syncropel/studio/src/widgets/ActivityHubWidget/index.tsx
"use client";

import React from "react";
import { Tabs, Box, Text, Tooltip, ActionIcon, Stack } from "@mantine/core";
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
import { ReadyState } from "react-use-websocket";

/**
 * A "smart" tab controller for the bottom Output Panel.
 * It dynamically renders tabs based on global state from useUIStateStore, creating
 * a context-aware and non-redundant user experience with a permanent "Terminal"
 * tab and dynamic, closable tabs for other contexts.
 */
export default function ActivityHubWidget({
  readyState,
}: {
  readyState: number;
}) {
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
  const isConnected = readyState === ReadyState.OPEN;

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative", // ADDED for overlay
      }}
    >
      {/* Connection Lost Overlay - Covers entire ActivityHub */}
      {!isConnected && (
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Stack align="center" gap="md">
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text size="xl" style={{ fontSize: 32 }}>
                ⚠️
              </Text>
            </Box>
            <Stack align="center" gap="xs">
              <Text size="xl" fw={700} c="red">
                Connection Lost
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Activity Hub is unavailable until connection is restored
              </Text>
            </Stack>
          </Stack>
        </Box>
      )}

      <Tabs
        value={activeOutputPanelTab}
        onChange={(value) => setActiveOutputPanelTab(value)}
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* CHANGED: Added flex-shrink-0 to prevent tabs from being compressed */}
        <Tabs.List className="flex-shrink-0">
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
        {/* CHANGED: Removed overflow-auto, added min-h-0 for proper flex scrolling */}
        {/* CHANGED: Added inline style to ensure flex column layout */}
        {outputPanelTabs.map((tabId) => (
          <Tabs.Panel
            key={tabId}
            value={tabId}
            style={{
              flexGrow: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            {renderPanelContent(tabId)}
          </Tabs.Panel>
        ))}
      </Tabs>
    </div>
  );
}
