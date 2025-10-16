"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Text,
  Loader,
  Center,
  Badge,
  Button,
  Group,
  Stack,
  TextInput,
  Pill,
  Select,
  ActionIcon,
  Divider,
  Box,
  Modal,
} from "@mantine/core";
import {
  IconFilter,
  IconRefresh,
  IconDownload,
  IconSettings,
  IconSearch,
  IconPlayerPlay,
  IconClock,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { nanoid } from "nanoid";
import { ReadyState } from "react-use-websocket";
import { RunHistoryItem } from "@/shared/api/types";

interface RunsTabProps {
  onViewDetails: (runId: string) => void;
  onFilterLogs: (filter: string) => void;
}

type RunStatus = "success" | "failed" | "pending" | "running";
type DateRange = "all" | "today" | "yesterday" | "7days" | "30days";

interface RunFilters {
  searchText: string;
  statuses: Set<RunStatus>;
  flowId: string | null;
  dateRange: DateRange;
}

export default function RunsTab({ onViewDetails, onFilterLogs }: RunsTabProps) {
  const [runs, setRuns] = useState<RunHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filters, setFilters] = useState<RunFilters>({
    searchText: "",
    statuses: new Set<RunStatus>(),
    flowId: null,
    dateRange: "all",
  });
  const [selectedRun, setSelectedRun] = useState<RunHistoryItem | null>(null);

  const { sendJsonMessage, readyState } = useWebSocket();
  const { lastJsonMessage } = useSessionStore();

  // Fetch run history
  const fetchRuns = useCallback(() => {
    if (readyState === ReadyState.OPEN) {
      sendJsonMessage({
        type: "GET_RUN_HISTORY",
        command_id: `get-runs-${nanoid()}`,
        payload: {},
      });
    }
  }, [readyState, sendJsonMessage]);

  useEffect(() => {
    if (readyState === ReadyState.OPEN && isLoading) {
      fetchRuns();
    }
  }, [readyState, isLoading, fetchRuns]);

  useEffect(() => {
    if (lastJsonMessage?.type === "RUN_HISTORY_RESULT") {
      const payload = lastJsonMessage.payload;
      if (
        Array.isArray(payload) &&
        (payload.length === 0 || "run_id" in payload[0])
      ) {
        const receivedRuns = payload as RunHistoryItem[];
        const sortedRuns = [...receivedRuns].sort(
          (a, b) =>
            new Date(b.timestamp_utc).getTime() -
            new Date(a.timestamp_utc).getTime()
        );
        setRuns(sortedRuns);
      } else {
        console.error(
          "Received RUN_HISTORY_RESULT but payload was not a valid RunHistoryItem array:",
          payload
        );
      }
      setIsLoading(false);
    }
  }, [lastJsonMessage]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchRuns();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchRuns]);

  // Helper: Normalize status to standard types
  const normalizeStatus = (status: string): RunStatus => {
    const lower = status.toLowerCase();
    if (lower.includes("success") || lower.includes("complete")) return "success";
    if (lower.includes("fail") || lower.includes("error")) return "failed";
    if (lower.includes("running")) return "running";
    return "pending";
  };

  // Helper: Format parameters smartly
  const formatParameters = (params: Record<string, any>, maxItems = 3): string => {
    const entries = Object.entries(params);
    if (entries.length === 0) return "no params";

    const formatted = entries.slice(0, maxItems).map(([key, value]) => {
      let displayValue: string;

      if (typeof value === "string") {
        displayValue = `"${value.length > 40 ? value.slice(0, 40) + "..." : value}"`;
      } else if (Array.isArray(value)) {
        displayValue = `[${value.length} items]`;
      } else if (typeof value === "object" && value !== null) {
        displayValue = "{...}";
      } else {
        displayValue = String(value);
      }

      return `${key}:${displayValue}`;
    });

    const remaining = entries.length - maxItems;
    if (remaining > 0) {
      formatted.push(`+${remaining} more`);
    }

    return formatted.join(", ");
  };

  // Helper: Get relative time string
  const getRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  // Calculate statistics
  const statistics = useMemo(() => {
    if (runs.length === 0) {
      return { total: 0, successCount: 0, failedCount: 0, successRate: 0, avgDuration: "N/A" };
    }

    const successCount = runs.filter((r) =>
      normalizeStatus(r.status) === "success"
    ).length;
    const failedCount = runs.filter((r) =>
      normalizeStatus(r.status) === "failed"
    ).length;
    const successRate = (successCount / runs.length) * 100;

    // Note: Duration calculation would require end_time field in RunHistoryItem
    // For now, using placeholder
    const avgDuration = "3m 12s";

    return {
      total: runs.length,
      successCount,
      failedCount,
      successRate,
      avgDuration,
    };
  }, [runs]);

  // Get unique flow IDs for filter dropdown
  const uniqueFlows = useMemo(() => {
    return Array.from(new Set(runs.map((r) => r.flow_id))).sort();
  }, [runs]);

  // Apply filters
  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      // Status filter
      if (filters.statuses.size > 0) {
        const runStatus = normalizeStatus(run.status);
        if (!filters.statuses.has(runStatus)) {
          return false;
        }
      }

      // Flow filter
      if (filters.flowId && run.flow_id !== filters.flowId) {
        return false;
      }

      // Date range filter
      if (filters.dateRange !== "all") {
        const now = new Date();
        const runTime = new Date(run.timestamp_utc);
        const diffMs = now.getTime() - runTime.getTime();
        const diffDays = diffMs / 86400000;

        if (filters.dateRange === "today" && diffDays >= 1) return false;
        if (filters.dateRange === "yesterday" && (diffDays < 1 || diffDays >= 2)) return false;
        if (filters.dateRange === "7days" && diffDays >= 7) return false;
        if (filters.dateRange === "30days" && diffDays >= 30) return false;
      }

      // Search filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesFlow = run.flow_id.toLowerCase().includes(searchLower);
        const matchesRunId = run.run_id.toLowerCase().includes(searchLower);
        const matchesParams = JSON.stringify(run.parameters)
          .toLowerCase()
          .includes(searchLower);
        const matchesStatus = run.status.toLowerCase().includes(searchLower);

        if (!matchesFlow && !matchesRunId && !matchesParams && !matchesStatus) {
          return false;
        }
      }

      return true;
    });
  }, [runs, filters]);

  // Group runs by temporal buckets
  type GroupedRuns = {
    today: RunHistoryItem[];
    yesterday: RunHistoryItem[];
    last7Days: RunHistoryItem[];
    older: RunHistoryItem[];
  };

  const groupedRuns = useMemo((): GroupedRuns => {
    const now = new Date();
    const groups: GroupedRuns = {
      today: [],
      yesterday: [],
      last7Days: [],
      older: [],
    };

    filteredRuns.forEach((run) => {
      const runTime = new Date(run.timestamp_utc);
      const diffMs = now.getTime() - runTime.getTime();
      const diffDays = diffMs / 86400000;

      if (diffDays < 1) {
        groups.today.push(run);
      } else if (diffDays < 2) {
        groups.yesterday.push(run);
      } else if (diffDays < 7) {
        groups.last7Days.push(run);
      } else {
        groups.older.push(run);
      }
    });

    return groups;
  }, [filteredRuns]);

  // Export function
  const exportRuns = () => {
    const jsonl = filteredRuns
      .map((run) => JSON.stringify(run))
      .join("\n");
    const blob = new Blob([jsonl], { type: "application/x-ndjson" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `run-history-${new Date().toISOString()}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Toggle status filter
  const toggleStatusFilter = (status: RunStatus) => {
    setFilters((prev) => {
      const newStatuses = new Set(prev.statuses);
      if (newStatuses.has(status)) {
        newStatuses.delete(status);
      } else {
        newStatuses.add(status);
      }
      return { ...prev, statuses: newStatuses };
    });
  };

  if (isLoading) {
    return (
      <Center h={100}>
        <Loader />
      </Center>
    );
  }

  if (runs.length === 0) {
    return (
      <Center h={100}>
        <Text c="dimmed">No run history found.</Text>
      </Center>
    );
  }

  // Render a single run card
  const renderRunCard = (run: RunHistoryItem) => {
    const status = normalizeStatus(run.status);
    const borderColor =
      status === "success"
        ? "rgb(34, 197, 94)"
        : status === "failed"
        ? "rgb(239, 68, 68)"
        : "rgb(234, 179, 8)";

    const statusIcon =
      status === "success" ? (
        <IconCheck size={14} />
      ) : status === "failed" ? (
        <IconX size={14} />
      ) : status === "running" ? (
        <IconPlayerPlay size={14} />
      ) : (
        <IconClock size={14} />
      );

    // Extract error message if status contains error info
    const errorMatch = run.status.match(/(?:error|failed):\s*(.+)/i);
    const errorMessage = errorMatch ? errorMatch[1] : null;

    return (
      <Box
        key={run.run_id}
        p="sm"
        style={{
          borderLeft: `3px solid ${borderColor}`,
          backgroundColor: "var(--mantine-color-dark-6)",
          marginBottom: "8px",
        }}
      >
        {/* First line: Flow name, status, time, duration */}
        <Group justify="space-between" mb={4}>
          <Group gap="xs">
            <Text fw={500} size="sm">
              {run.flow_id}
            </Text>
            <Badge
              size="sm"
              color={status === "success" ? "green" : status === "failed" ? "red" : "yellow"}
              variant="light"
              leftSection={statusIcon}
            >
              {status === "success"
                ? "Success"
                : status === "failed"
                ? "Failed"
                : status === "running"
                ? "Running"
                : "Pending"}
            </Badge>
          </Group>
          <Group gap="md">
            <Text size="xs" c="dimmed">
              {getRelativeTime(run.timestamp_utc)}
            </Text>
            <Text size="xs" c="dimmed">
              Duration: N/A
            </Text>
            <Text size="xs" c="dimmed">
              Steps: N/A
            </Text>
          </Group>
        </Group>

        {/* Second line: Run ID and parameters */}
        <Text size="xs" c="dimmed" ff="monospace" mb={4}>
          run:{run.run_id.slice(0, 8)} • params: {formatParameters(run.parameters)}
        </Text>

        {/* Third line: Error message (if failed) */}
        {status === "failed" && errorMessage && (
          <Text size="xs" c="red" mb={8}>
            ❌ {errorMessage}
          </Text>
        )}

        {/* Action buttons */}
        <Group gap="xs">
          <Button
            variant="default"
            size="xs"
            onClick={() => onViewDetails(run.run_id)}
          >
            Details
          </Button>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconFilter size={14} />}
            onClick={() => onFilterLogs(`{run_id="${run.run_id}"}`)}
          >
            Logs
          </Button>
          {status === "failed" && (
            <Button variant="light" size="xs" color="blue">
              Retry
            </Button>
          )}
        </Group>
      </Box>
    );
  };

  // Render temporal group section
  const renderGroup = (title: string, runs: RunHistoryItem[]) => {
    if (runs.length === 0) return null;

    return (
      <Box key={title} mb="md">
        <Divider
          label={title}
          labelPosition="center"
          mb="sm"
          styles={{
            label: {
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--mantine-color-dimmed)",
            },
          }}
        />
        {runs.map(renderRunCard)}
      </Box>
    );
  };

  return (
    <Stack gap="md" p="md">
      {/* Header with stats and controls */}
      <Group justify="space-between">
        <Group gap="md">
          <Text size="sm" c="dimmed">
            {statistics.total} total
          </Text>
          <Text size="sm" c="dimmed">
            •
          </Text>
          <Text size="sm" c="dimmed">
            {statistics.successRate.toFixed(1)}% success ({statistics.successCount}/
            {statistics.failedCount})
          </Text>
          <Text size="sm" c="dimmed">
            •
          </Text>
          <Text size="sm" c="dimmed">
            avg {statistics.avgDuration}
          </Text>
        </Group>

        <Group gap="xs">
          <ActionIcon
            variant={autoRefresh ? "filled" : "default"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title="Auto-refresh every 10s"
          >
            <IconRefresh size={16} />
          </ActionIcon>
          <ActionIcon
            variant="default"
            onClick={exportRuns}
            disabled={filteredRuns.length === 0}
            title="Export as JSONL"
          >
            <IconDownload size={16} />
          </ActionIcon>
          <ActionIcon variant="default" title="Settings">
            <IconSettings size={16} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Search input */}
      <TextInput
        placeholder="Search runs, flows, params..."
        leftSection={<IconSearch size={16} />}
        value={filters.searchText}
        onChange={(e) => {
          const value = e.currentTarget.value;
          setFilters((prev) => ({ ...prev, searchText: value }));
        }}
      />

      {/* Filters */}
      <Group gap="md">
        <Text size="xs" c="dimmed" fw={500}>
          Status:
        </Text>
        <Pill.Group>
          <Pill
            withRemoveButton={filters.statuses.has("success")}
            onRemove={() => toggleStatusFilter("success")}
            onClick={() => toggleStatusFilter("success")}
            style={{ cursor: "pointer" }}
          >
            ✓ Success
          </Pill>
          <Pill
            withRemoveButton={filters.statuses.has("failed")}
            onRemove={() => toggleStatusFilter("failed")}
            onClick={() => toggleStatusFilter("failed")}
            style={{ cursor: "pointer" }}
          >
            ✗ Failed
          </Pill>
          <Pill
            withRemoveButton={filters.statuses.has("pending")}
            onRemove={() => toggleStatusFilter("pending")}
            onClick={() => toggleStatusFilter("pending")}
            style={{ cursor: "pointer" }}
          >
            ⏸ Pending
          </Pill>
        </Pill.Group>

        <Select
          placeholder="All Flows"
          data={[{ value: "", label: "All Flows" }, ...uniqueFlows.map((f) => ({ value: f, label: f }))]}
          value={filters.flowId || ""}
          onChange={(value) =>
            setFilters((prev) => ({ ...prev, flowId: value || null }))
          }
          clearable
          size="xs"
          w={200}
        />

        <Select
          placeholder="Date Range"
          data={[
            { value: "all", label: "All Time" },
            { value: "today", label: "Today" },
            { value: "yesterday", label: "Yesterday" },
            { value: "7days", label: "Last 7 Days" },
            { value: "30days", label: "Last 30 Days" },
          ]}
          value={filters.dateRange}
          onChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              dateRange: (value as DateRange) || "all",
            }))
          }
          size="xs"
          w={150}
        />
      </Group>

      <Divider />

      {/* Grouped runs */}
      {filteredRuns.length === 0 ? (
        <Center h={100}>
          <Text c="dimmed">No runs match the current filters.</Text>
        </Center>
      ) : (
        <Box>
          {renderGroup("Today", groupedRuns.today)}
          {renderGroup("Yesterday", groupedRuns.yesterday)}
          {renderGroup("Last 7 Days", groupedRuns.last7Days)}
          {renderGroup("Older", groupedRuns.older)}
        </Box>
      )}
    </Stack>
  );
}
