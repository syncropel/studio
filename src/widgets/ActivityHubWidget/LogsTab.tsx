// /home/dpwanjala/repositories/syncropel/studio/src/widgets/ActivityHubWidget/LogsTab.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box,
  Text,
  Loader,
  Center,
  Badge,
  Stack,
  Code,
  Group,
  ScrollArea,
  ActionIcon,
  Tooltip,
  MantineColor,
} from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useArtifactQuery } from "@/shared/hooks/useArtifactQuery";
import { nanoid } from "nanoid";
import { ReadyState } from "react-use-websocket";
import { DataRef } from "@/shared/api/types";

// --- TYPES & HELPERS ---

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEvent {
  level: LogLevel;
  message: string;
  timestamp: string;
  fields?: Record<string, any>;
  labels?: Record<string, any>;
}

interface LogsTabProps {
  filter: string; // The raw filter string, e.g., `run_id="xyz", step_id="abc"`
}

const getLogLevelColor = (level: LogLevel): MantineColor => {
  switch (level) {
    case "error":
      return "red";
    case "warn":
      return "yellow";
    case "info":
      return "blue";
    default:
      return "gray";
  }
};

const LogLine = ({ log }: { log: LogEvent }) => (
  <Box
    className={`py-1.5 px-3 font-mono text-xs border-l-2 hover:bg-gray-100 dark:hover:bg-gray-800 border-l-${getLogLevelColor(
      log.level
    )}-5`}
  >
    <Text component="span" c="dimmed" mr="md">
      {new Date(log.timestamp).toLocaleTimeString([], {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </Text>
    <Badge
      size="xs"
      variant="light"
      color={getLogLevelColor(log.level)}
      mr="md"
    >
      {log.level.toUpperCase()}
    </Badge>
    <Text component="span">{log.message}</Text>
  </Box>
);

export default function LogsTab({ filter }: LogsTabProps) {
  // --- DATA FETCHING LOGIC ---
  const [dataRef, setDataRef] = useState<DataRef | null>(null);
  const {
    data: logs,
    isLoading,
    isError,
    error,
    refetch,
  } = useArtifactQuery(
    dataRef || { artifact_id: "", access_url: "", renderer_hint: "" },
    !!dataRef
  );

  const { sendJsonMessage, readyState } = useWebSocket();
  const { lastJsonMessage } = useSessionStore();

  // A stable ID for this component instance to correlate WebSocket messages
  const commandId = useMemo(() => `logs-query-${nanoid(8)}`, [filter]);

  // Parse the filter string into an object for the command payload
  const filterObject = useMemo(() => {
    try {
      return Object.fromEntries(
        filter.split(",").map((part) => {
          const [key, value] = part
            .split("=")
            .map((s) => s.trim().replace(/"/g, ""));
          return [key, value];
        })
      );
    } catch {
      console.error("Failed to parse log filter string:", filter);
      return {};
    }
  }, [filter]);

  // 1. Send the command to get the DataRef
  const fetchLogsRef = useCallback(() => {
    if (readyState === ReadyState.OPEN) {
      sendJsonMessage({
        type: "LOGS.QUERY",
        command_id: commandId,
        payload: {
          filters: filterObject,
          limit: 5000, // A generous limit for logs
        },
      });
    }
  }, [readyState, sendJsonMessage, commandId, filterObject]);

  useEffect(() => {
    fetchLogsRef();
  }, [fetchLogsRef]);

  // 2. Listen for the WebSocket response containing the DataRef
  useEffect(() => {
    if (
      lastJsonMessage?.type === "LOGS.QUERY_RESULT" &&
      lastJsonMessage.command_id === commandId
    ) {
      const receivedDataRef = lastJsonMessage.payload.fields as
        | DataRef
        | undefined;
      if (receivedDataRef) {
        setDataRef(receivedDataRef); // This enables the useArtifactQuery hook
      } else {
        // Handle case where backend might send an empty result directly
        // For now, we assume it will always send a DataRef or an error.
      }
    }
  }, [lastJsonMessage, commandId]);

  if (isLoading && !logs) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center h={200}>
        <Text c="red">Error fetching logs: {error.message}</Text>
      </Center>
    );
  }

  return (
    <Stack gap={0} className="h-full">
      <Group
        justify="space-between"
        p="xs"
        className="border-b border-gray-200 dark:border-gray-800 flex-shrink-0"
      >
        <Group gap="xs">
          <Text size="xs" fw={500}>
            Filter:
          </Text>
          <Code>{filter}</Code>
        </Group>
        <Tooltip label="Copy Filter" withArrow>
          <ActionIcon
            variant="default"
            size="sm"
            onClick={() => navigator.clipboard.writeText(filter)}
            aria-label="Copy log filter"
          >
            <IconCopy size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <ScrollArea className="flex-1">
        {logs && Array.isArray(logs) && logs.length > 0 ? (
          (logs as LogEvent[]).map((log, index) => (
            <LogLine key={`${log.timestamp}-${index}`} log={log} />
          ))
        ) : (
          <Center h={100}>
            <Text c="dimmed">No logs found for this filter.</Text>
          </Center>
        )}
      </ScrollArea>
    </Stack>
  );
}
