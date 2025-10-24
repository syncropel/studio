// /home/dpwanjala/repositories/syncropel/studio/src/widgets/ActivityHubWidget/RunsTab.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box,
  Text,
  Loader,
  Center,
  Badge,
  Button,
  Group,
  Stack,
  TextInput,
  ScrollArea,
  ActionIcon,
  MantineColor,
} from "@mantine/core";
import {
  IconSearch,
  IconRefresh,
  IconCheck,
  IconX,
  IconClock,
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

// --- Helper Functions ---

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

const getStatusColor = (status: RunStatus): MantineColor => {
  if (status === "success") return "green";
  if (status === "failed") return "red";
  return "yellow";
};

const getStatusIcon = (status: RunStatus) => {
  if (status === "success") return <IconCheck size={14} />;
  if (status === "failed") return <IconX size={14} />;
  return <IconClock size={14} />;
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

export default function RunsTab({ onViewDetails, onFilterLogs }: RunsTabProps) {
  // --- DATA FETCHING LOGIC ---
  // 1. We hold the "claim check" (DataRef) in local state.
  const [dataRef, setDataRef] = useState<DataRef | null>(null);

  // 1. Conditionally enable the query.
  // 2. Pass a valid-but-empty DataRef when it's null to prevent the hook from crashing.
  const {
    data: runs,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useArtifactQuery(
    dataRef || { artifact_id: "", access_url: "", renderer_hint: "" }, // Provide a dummy object
    !!dataRef // The hook is only enabled when dataRef is NOT null.
  );
  const { sendJsonMessage, readyState } = useWebSocket();
  const { lastJsonMessage } = useSessionStore();

  // A stable ID for this component instance to correlate WebSocket messages.
  const commandId = useMemo(() => `history-query-${nanoid()}`, []);

  // 3. This function sends the command to the server to *get the DataRef*.
  const fetchRunHistoryRef = useCallback(() => {
    if (readyState === ReadyState.OPEN) {
      sendJsonMessage({
        type: "HISTORY.QUERY",
        command_id: commandId,
        payload: { limit: 100 }, // A sensible default limit
      });
    }
  }, [readyState, sendJsonMessage, commandId]);

  // 4. Trigger the initial fetch when the component mounts.
  useEffect(() => {
    fetchRunHistoryRef();
  }, [fetchRunHistoryRef]);

  // 5. Listen for the WebSocket response that contains the DataRef.
  useEffect(() => {
    if (
      lastJsonMessage?.type === "HISTORY.QUERY_RESULT" &&
      lastJsonMessage.command_id === commandId
    ) {
      const receivedDataRef = lastJsonMessage.payload.fields as
        | DataRef
        | undefined;
      if (receivedDataRef) {
        setDataRef(receivedDataRef); // This enables the useArtifactQuery hook to start fetching.
      }
    }
  }, [lastJsonMessage, commandId]);

  // 6. Sort the data once it's fetched by React Query.
  const sortedRuns = useMemo(() => {
    if (!runs || !Array.isArray(runs)) return [];
    return [...(runs as RunHistoryItem[])].sort(
      (a, b) =>
        new Date(b.timestamp_utc).getTime() -
        new Date(a.timestamp_utc).getTime()
    );
  }, [runs]);

  // --- RENDER LOGIC ---

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
      <Group
        justify="space-between"
        p="md"
        className="border-b border-gray-200 dark:border-gray-800 flex-shrink-0"
      >
        <TextInput
          placeholder="Search by Flow ID or Run ID..."
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1 }}
          disabled
        />
        <ActionIcon
          variant="default"
          onClick={() => refetch()}
          loading={isRefetching}
          aria-label="Refresh run history"
        >
          <IconRefresh size={16} />
        </ActionIcon>
      </Group>
      <ScrollArea className="flex-1">
        {sortedRuns.length > 0 ? (
          sortedRuns.map((run) => {
            const status = normalizeStatus(run.status);
            return (
              <Box
                key={run.run_id}
                p="sm"
                className="border-b border-gray-200 dark:border-gray-800"
              >
                <Group justify="space-between" wrap="nowrap">
                  <Box className="min-w-0">
                    <Text fw={500} size="sm" truncate>
                      {run.flow_id}
                    </Text>
                    <Text size="xs" c="dimmed" ff="monospace" truncate>
                      run:{run.run_id}
                    </Text>
                  </Box>
                  <Badge
                    color={getStatusColor(status)}
                    variant="light"
                    leftSection={getStatusIcon(status)}
                    className="flex-shrink-0"
                  >
                    {status}
                  </Badge>
                </Group>
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
                      onClick={() => onFilterLogs(`run_id="${run.run_id}"`)}
                    >
                      Logs
                    </Button>
                  </Group>
                </Group>
              </Box>
            );
          })
        ) : (
          <Center h={100}>
            <Text c="dimmed">No run history found.</Text>
          </Center>
        )}
      </ScrollArea>
    </Stack>
  );
}
