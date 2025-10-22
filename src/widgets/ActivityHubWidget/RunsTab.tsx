// /home/dpwanjala/repositories/syncropel/studio/src/widgets/ActivityHubWidget/RunsTab.tsx
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
  ScrollArea,
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
import { RunHistoryItem, RunHistoryResultFields } from "@/shared/api/types";

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

  const { sendJsonMessage, readyState } = useWebSocket();
  const { lastJsonMessage } = useSessionStore();

  const fetchRuns = useCallback(() => {
    if (readyState === ReadyState.OPEN) {
      setIsLoading(true);
      sendJsonMessage({
        type: "GET_RUN_HISTORY",
        command_id: `get-runs-${nanoid()}`,
        payload: {},
      });
    }
  }, [readyState, sendJsonMessage]);

  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      fetchRuns();
    }
  }, [readyState, fetchRuns]);

  useEffect(() => {
    if (lastJsonMessage?.type === "RUN_HISTORY_RESULT") {
      const receivedRuns = lastJsonMessage.payload.fields as
        | RunHistoryResultFields
        | undefined;
      if (Array.isArray(receivedRuns)) {
        const sortedRuns = [...receivedRuns].sort(
          (a, b) =>
            new Date(b.timestamp_utc).getTime() -
            new Date(a.timestamp_utc).getTime()
        );
        setRuns(sortedRuns);
      } else {
        console.error(
          "Received RUN_HISTORY_RESULT but payload was not a valid array:",
          receivedRuns
        );
      }
      setIsLoading(false);
    }
  }, [lastJsonMessage]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchRuns(), 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRuns]);

  const normalizeStatus = (status: string): RunStatus => {
    const lower = status.toLowerCase();
    if (lower.includes("success") || lower.includes("complete"))
      return "success";
    if (lower.includes("fail") || lower.includes("error")) return "failed";
    if (lower.includes("running")) return "running";
    return "pending";
  };

  const formatParameters = (params: Record<string, any>): string => {
    const entries = Object.entries(params);
    if (entries.length === 0) return "no params";
    return entries
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(", ");
  };

  const getRelativeTime = (timestamp: string): string => {
    const diffMs = new Date().getTime() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      if (
        filters.statuses.size > 0 &&
        !filters.statuses.has(normalizeStatus(run.status))
      )
        return false;
      if (filters.flowId && run.flow_id !== filters.flowId) return false;
      // Date range and search text filters can be added here
      return true;
    });
  }, [runs, filters]);

  const uniqueFlows = useMemo(
    () => Array.from(new Set(runs.map((r) => r.flow_id))).sort(),
    [runs]
  );

  const toggleStatusFilter = (status: RunStatus) => {
    setFilters((prev) => {
      const newStatuses = new Set(prev.statuses);
      newStatuses.has(status)
        ? newStatuses.delete(status)
        : newStatuses.add(status);
      return { ...prev, statuses: newStatuses };
    });
  };

  if (isLoading)
    return (
      <Center h={100}>
        <Loader />
      </Center>
    );
  if (runs.length === 0)
    return (
      <Center h={100}>
        <Text c="dimmed">No run history found.</Text>
      </Center>
    );

  const renderRunCard = (run: RunHistoryItem) => {
    const status = normalizeStatus(run.status);
    const borderColor =
      status === "success" ? "green" : status === "failed" ? "red" : "yellow";
    const statusIcon =
      status === "success" ? (
        <IconCheck size={14} />
      ) : status === "failed" ? (
        <IconX size={14} />
      ) : (
        <IconClock size={14} />
      );

    return (
      <Box
        key={run.run_id}
        p="sm"
        mb="xs"
        style={{
          borderLeft: `3px solid var(--mantine-color-${borderColor}-6)`,
        }}
      >
        <Group justify="space-between">
          <Box>
            <Text fw={500} size="sm">
              {run.flow_id}
            </Text>
            <Text size="xs" c="dimmed" ff="monospace">
              run:{run.run_id.slice(0, 8)}
            </Text>
          </Box>
          <Badge color={borderColor} variant="light" leftSection={statusIcon}>
            {status}
          </Badge>
        </Group>
        <Text size="xs" c="dimmed" mt="xs">
          {formatParameters(run.parameters)}
        </Text>
        <Group justify="space-between" mt="sm">
          <Text size="xs" c="dimmed">
            {getRelativeTime(run.timestamp_utc)}
          </Text>
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
              onClick={() => onFilterLogs(`{run_id="${run.run_id}"}`)}
            >
              Logs
            </Button>
          </Group>
        </Group>
      </Box>
    );
  };

  return (
    <Stack gap="md" p="md">
      <Group justify="space-between">
        <TextInput
          placeholder="Search runs..."
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1 }}
        />
        <ActionIcon variant="default" onClick={fetchRuns}>
          <IconRefresh size={16} />
        </ActionIcon>
      </Group>
      <Group>
        {(["success", "failed", "pending"] as RunStatus[]).map((status) => (
          <Pill
            key={status}
            withRemoveButton={filters.statuses.has(status)}
            onRemove={() => toggleStatusFilter(status)}
            onClick={() => toggleStatusFilter(status)}
          >
            {status}
          </Pill>
        ))}
      </Group>
      <ScrollArea style={{ flex: 1 }}>
        {filteredRuns.length > 0 ? (
          filteredRuns.map(renderRunCard)
        ) : (
          <Center h={100}>
            <Text c="dimmed">No runs match filters.</Text>
          </Center>
        )}
      </ScrollArea>
    </Stack>
  );
}
