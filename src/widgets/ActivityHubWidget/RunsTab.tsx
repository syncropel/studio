// /home/dpwanjala/repositories/syncropel/studio/src/widgets/ActivityHubWidget/RunsTab.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box,
  Text,
  Loader,
  Center,
  Button,
  Group,
  Stack,
  TextInput,
  ScrollArea,
  ActionIcon,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconSearch,
  IconRefresh,
  IconCheck,
  IconX,
  IconClock,
  IconFileText,
  IconChartBar,
} from "@tabler/icons-react";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useArtifactQuery } from "@/shared/hooks/useArtifactQuery";
import { nanoid } from "nanoid";
import { ReadyState } from "react-use-websocket";
import { RunHistoryItem, DataRef } from "@/shared/api/types";

interface RunsTabProps {
  onViewDetails: (runId: string) => void;
  onFilterLogs: (filter: string) => void;
}

type RunStatus = "success" | "failed" | "pending" | "running";
type StatusFilter = "all" | "success" | "failed" | "running";

// --- Helper Functions ---

// CHANGED: Simplified status normalization for compact display
const normalizeStatus = (status: string): RunStatus => {
  if (!status) return "pending";
  const lower = status.toLowerCase();
  if (
    lower.includes("success") ||
    lower.includes("complete") ||
    lower.includes("✅")
  )
    return "success";
  if (lower.includes("fail") || lower.includes("error") || lower.includes("❌"))
    return "failed";
  if (
    lower.includes("running") ||
    lower.includes("in progress") ||
    lower.includes("🔄")
  )
    return "running";
  return "pending";
};

// CHANGED: Simplified to return emoji for ultra-compact display
const getStatusEmoji = (status: RunStatus): string => {
  if (status === "success") return "✅";
  if (status === "failed") return "❌";
  if (status === "running") return "🔄";
  return "⏳";
};

// CHANGED: More compact relative time format (11m, 2h, 1d instead of "11m ago")
const getCompactRelativeTime = (timestamp: string): string => {
  const diffMs = new Date().getTime() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffMs / 86400000);
  return `${diffDays}d`;
};

// CHANGED: Truncate run ID to first 7 characters for compact display
const getShortRunId = (runId: string): string => {
  return runId.slice(0, 7);
};

// CHANGED: Format parameters as compact key=val or "-" if empty
const formatCompactParams = (params: Record<string, any>): string => {
  const entries = Object.entries(params);
  if (entries.length === 0) return "-";
  const firstParam = entries[0];
  let value = String(firstParam[1]);
  // Truncate long values
  if (value.length > 12) {
    value = value.slice(0, 12) + "..";
  }
  let summary = `${firstParam[0]}=${value}`;
  if (entries.length > 1) {
    summary += `+${entries.length - 1}`;
  }
  return summary;
};

export default function RunsTab({ onViewDetails, onFilterLogs }: RunsTabProps) {
  // --- DATA FETCHING LOGIC ---
  const [dataRef, setDataRef] = useState<DataRef | null>(null);
  const {
    data: runs,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useArtifactQuery(
    dataRef || { artifact_id: "", access_url: "", renderer_hint: "" },
    !!dataRef
  );

  // CHANGED: Added state for search and status filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { sendJsonMessage, readyState } = useWebSocket();
  const { lastJsonMessage } = useSessionStore();
  const commandId = useMemo(() => `history-query-${nanoid()}`, []);

  const fetchRunHistoryRef = useCallback(() => {
    if (readyState === ReadyState.OPEN) {
      sendJsonMessage({
        type: "HISTORY.QUERY",
        command_id: commandId,
        payload: { limit: 100 },
      });
    }
  }, [readyState, sendJsonMessage, commandId]);

  useEffect(() => {
    fetchRunHistoryRef();
  }, [fetchRunHistoryRef]);

  useEffect(() => {
    if (
      lastJsonMessage?.type === "HISTORY.QUERY_RESULT" &&
      lastJsonMessage.command_id === commandId
    ) {
      const receivedDataRef = lastJsonMessage.payload.fields as
        | DataRef
        | undefined;
      if (receivedDataRef) {
        setDataRef(receivedDataRef);
      }
    }
  }, [lastJsonMessage, commandId]);

  // CHANGED: Enhanced filtering logic with search and status filter
  const filteredAndSortedRuns = useMemo(() => {
    if (!runs || !Array.isArray(runs)) return [];

    const searchLower = searchTerm.toLowerCase();

    let filtered = (runs as RunHistoryItem[]).filter((run) => {
      // Apply search filter
      const matchesSearch =
        !searchTerm ||
        run.flow_id.toLowerCase().includes(searchLower) ||
        run.run_id.toLowerCase().includes(searchLower);

      // Apply status filter
      const status = normalizeStatus(run.status);
      const matchesStatus = statusFilter === "all" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort by timestamp descending (newest first)
    return filtered.sort(
      (a, b) =>
        new Date(b.timestamp_utc).getTime() -
        new Date(a.timestamp_utc).getTime()
    );
  }, [runs, searchTerm, statusFilter]);

  // CHANGED: Calculate stats for footer
  const stats = useMemo(() => {
    if (!runs || !Array.isArray(runs)) {
      return { total: 0, success: 0, failed: 0, running: 0, pending: 0 };
    }

    const typedRuns = runs as RunHistoryItem[];
    return {
      total: typedRuns.length,
      success: typedRuns.filter((r) => normalizeStatus(r.status) === "success")
        .length,
      failed: typedRuns.filter((r) => normalizeStatus(r.status) === "failed")
        .length,
      running: typedRuns.filter((r) => normalizeStatus(r.status) === "running")
        .length,
      pending: typedRuns.filter((r) => normalizeStatus(r.status) === "pending")
        .length,
    };
  }, [runs]);

  if (isLoading && !runs) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center h={200}>
        <Text c="red">Error fetching run history: {error.message}</Text>
      </Center>
    );
  }

  return (
    <Stack gap={0} className="h-full">
      {/* CHANGED: Ultra-compact header with search, filters, and refresh */}
      <Group
        justify="space-between"
        p="xs"
        gap="xs"
        className="border-b border-gray-200 dark:border-gray-800 flex-shrink-0"
      >
        <Group gap="xs" style={{ flex: 1 }}>
          <TextInput
            placeholder="Search..."
            leftSection={<IconSearch size={14} />}
            size="xs"
            style={{ minWidth: 180 }}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.currentTarget.value)}
          />
          <ActionIcon
            variant="default"
            size="sm"
            onClick={() => refetch()}
            loading={isRefetching}
            aria-label="Refresh run history"
          >
            <IconRefresh size={14} />
          </ActionIcon>
        </Group>

        {/* CHANGED: Status filter buttons */}
        <Group gap={4}>
          <Button
            variant={statusFilter === "all" ? "light" : "subtle"}
            size="xs"
            onClick={() => setStatusFilter("all")}
            leftSection={<Text size="xs">📊</Text>}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "success" ? "light" : "subtle"}
            size="xs"
            color="green"
            onClick={() => setStatusFilter("success")}
            leftSection={<Text size="xs">✅</Text>}
          >
            Success
          </Button>
          <Button
            variant={statusFilter === "failed" ? "light" : "subtle"}
            size="xs"
            color="red"
            onClick={() => setStatusFilter("failed")}
            leftSection={<Text size="xs">❌</Text>}
          >
            Failed
          </Button>
          <Button
            variant={statusFilter === "running" ? "light" : "subtle"}
            size="xs"
            color="blue"
            onClick={() => setStatusFilter("running")}
            leftSection={<Text size="xs">⏳</Text>}
          >
            Running
          </Button>
        </Group>

        {/* CHANGED: Compact pagination info */}
        <Text size="xs" c="dimmed" className="whitespace-nowrap">
          {filteredAndSortedRuns.length} of {stats.total}
        </Text>
      </Group>

      {/* CHANGED: Ultra-compact scrollable list */}
      <ScrollArea className="flex-1">
        {filteredAndSortedRuns.length > 0 ? (
          <Box>
            {filteredAndSortedRuns.map((run) => {
              const status = normalizeStatus(run.status);
              return (
                // CHANGED: Single-line ultra-compact layout
                <Box
                  key={run.run_id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  style={{
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                  }}
                >
                  {/* Status emoji */}
                  <Text size="sm" className="flex-shrink-0">
                    {getStatusEmoji(status)}
                  </Text>

                  {/* Time */}
                  <Text
                    size="xs"
                    c="dimmed"
                    className="flex-shrink-0"
                    style={{ width: "32px", textAlign: "right" }}
                  >
                    {getCompactRelativeTime(run.timestamp_utc)}
                  </Text>

                  {/* Short Run ID */}
                  <Text
                    size="xs"
                    c="dimmed"
                    className="flex-shrink-0"
                    style={{ width: "60px" }}
                  >
                    {getShortRunId(run.run_id)}
                  </Text>

                  {/* Flow name - takes remaining space */}
                  <Text
                    size="xs"
                    style={{ flex: 1, minWidth: 0 }}
                    truncate
                    title={run.flow_id}
                  >
                    {run.flow_id}
                  </Text>

                  {/* Parameters - compact */}
                  <Text
                    size="xs"
                    c="dimmed"
                    className="flex-shrink-0"
                    style={{ width: "120px" }}
                    truncate
                    title={JSON.stringify(run.parameters)}
                  >
                    {formatCompactParams(run.parameters)}
                  </Text>

                  {/* CHANGED: Icon-only action buttons */}
                  <Group gap={4} className="flex-shrink-0">
                    <Tooltip label="Details" withArrow>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(run.run_id);
                        }}
                      >
                        <IconFileText size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Logs" withArrow>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFilterLogs(`run_id="${run.run_id}"`);
                        }}
                      >
                        <IconChartBar size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Center h={100}>
            <Text size="sm" c="dimmed">
              {searchTerm || statusFilter !== "all"
                ? "No runs match your filters."
                : "No run history found."}
            </Text>
          </Center>
        )}
      </ScrollArea>

      {/* CHANGED: Footer with aggregated stats */}
      {filteredAndSortedRuns.length > 0 && (
        <Box
          p="xs"
          className="border-t border-gray-200 dark:border-gray-800 flex-shrink-0"
        >
          <Text size="xs" c="dimmed" ta="center">
            {filteredAndSortedRuns.length} shown • {stats.success} ✅ •{" "}
            {stats.failed} ❌ • {stats.running} 🔄 • {stats.pending} ⏳
          </Text>
        </Box>
      )}
    </Stack>
  );
}
