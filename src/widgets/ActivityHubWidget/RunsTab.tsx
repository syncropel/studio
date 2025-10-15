"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  Text,
  Loader,
  Center,
  Badge,
  Button,
  Group,
} from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { nanoid } from "nanoid";
import { ReadyState } from "react-use-websocket";
import { RunHistoryItem } from "@/shared/api/types";

interface RunsTabProps {
  onViewDetails: (runId: string) => void;
  onFilterLogs: (filter: string) => void;
}

export default function RunsTab({ onViewDetails, onFilterLogs }: RunsTabProps) {
  const [runs, setRuns] = useState<RunHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { sendJsonMessage, readyState } = useWebSocket();
  const { lastJsonMessage } = useSessionStore();

  useEffect(() => {
    if (readyState === ReadyState.OPEN && isLoading) {
      sendJsonMessage({
        type: "GET_RUN_HISTORY",
        command_id: `get-runs-${nanoid()}`,
        payload: {},
      });
    }
  }, [readyState, isLoading, sendJsonMessage]);

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

  const rows = runs.map((run) => (
    <Table.Tr key={run.run_id}>
      <Table.Td>{new Date(run.timestamp_utc).toLocaleString()}</Table.Td>
      <Table.Td>
        <Text ff="monospace" fz="xs">
          {run.flow_id}
        </Text>
      </Table.Td>
      <Table.Td>
        <Badge
          color={run.status.includes("Success") ? "green" : "red"}
          variant="light"
        >
          {run.status}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text ff="monospace" fz="xs" truncate>
          {JSON.stringify(run.parameters)}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <Button
            variant="default"
            size="xs"
            onClick={() => onViewDetails(run.run_id)}
          >
            View Details
          </Button>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconFilter size={14} />}
            onClick={() => onFilterLogs(`{run_id="${run.run_id}"}`)}
          >
            Logs
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table striped withTableBorder withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Timestamp</Table.Th>
          <Table.Th>Flow / Command</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th>Parameters</Table.Th>
          <Table.Th>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
}
