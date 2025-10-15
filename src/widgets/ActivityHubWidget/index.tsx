"use client";

import { useState } from "react";
import { Tabs, Box, Text, Group } from "@mantine/core";
import {
  IconHistory,
  IconTerminal2,
  IconActivity,
  IconFileText,
} from "@tabler/icons-react";
import EventsTab from "./EventsTab";
import TerminalTab from "./TerminalTab";
import RunsTab from "./RunsTab";
import RunInspectorTab from "./RunInspectorTab";

export default function ActivityHubWidget() {
  const [activeTab, setActiveTab] = useState<string | null>("runs"); // State can now be null
  const [inspectedRunIds, setInspectedRunIds] = useState<string[]>([]);
  const [eventFilter, setEventFilter] = useState("");

  const openRunInspector = (runId: string) => {
    if (!inspectedRunIds.includes(runId)) {
      setInspectedRunIds((prev) => [...prev, runId]);
    }
    setActiveTab(`run-detail-${runId}`);
  };

  const closeRunInspector = (runId: string) => {
    setInspectedRunIds((prev) => prev.filter((id) => id !== runId));
    if (activeTab === `run-detail-${runId}`) {
      setActiveTab("runs");
    }
  };

  const navigateToLogs = (filter: string) => {
    setEventFilter(filter);
    setActiveTab("events");
  };

  // --- START: DEFINITIVE FIX ---
  // This handler correctly accepts `string | null` and provides a fallback.
  const handleTabChange = (value: string | null) => {
    setActiveTab(value ?? "runs"); // Fallback to 'runs' if value is null
  };
  // --- END: DEFINITIVE FIX ---

  return (
    <Box className="h-full w-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        className="flex flex-col flex-grow h-full"
      >
        <Tabs.List>
          <Tabs.Tab value="runs" leftSection={<IconHistory size={14} />}>
            Runs
          </Tabs.Tab>
          <Tabs.Tab value="events" leftSection={<IconFileText size={14} />}>
            Events
          </Tabs.Tab>
          <Tabs.Tab value="terminal" leftSection={<IconTerminal2 size={14} />}>
            Terminal
          </Tabs.Tab>
          {inspectedRunIds.map((runId) => (
            <Tabs.Tab
              key={runId}
              value={`run-detail-${runId}`}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  closeRunInspector(runId);
                }
              }}
            >
              <Group gap="xs">
                <Text size="xs" component="span">
                  Run: ...{runId.slice(-6)}
                </Text>
                <Text
                  size="xs"
                  c="dimmed"
                  component="span"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeRunInspector(runId);
                  }}
                >
                  &times;
                </Text>
              </Group>
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Tabs.Panel value="runs" className="flex-grow overflow-auto">
          <RunsTab
            onViewDetails={openRunInspector}
            onFilterLogs={navigateToLogs}
          />
        </Tabs.Panel>

        <Tabs.Panel value="events" className="flex-grow overflow-auto">
          <EventsTab initialFilter={eventFilter} />
        </Tabs.Panel>

        <Tabs.Panel value="terminal" className="flex-grow overflow-auto">
          <TerminalTab />
        </Tabs.Panel>

        {inspectedRunIds.map((runId) => (
          <Tabs.Panel
            key={runId}
            value={`run-detail-${runId}`}
            className="flex-grow overflow-auto"
          >
            <RunInspectorTab runId={runId} onFilterLogs={navigateToLogs} />
          </Tabs.Panel>
        ))}
      </Tabs>
    </Box>
  );
}
