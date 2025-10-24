// /home/dpwanjala/repositories/syncropel/studio/src/widgets/ActivityHubWidget/RunInspectorTab.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Title,
  Text,
  Button,
  Group,
  Loader,
  Center,
  Code,
  Badge,
  MantineColor,
} from "@mantine/core";
import { IconFilter, IconDownload, IconEye } from "@tabler/icons-react";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { nanoid } from "nanoid";
import { RunDetail } from "@/shared/api/types";

interface RunInspectorTabProps {
  runId: string;
  onFilterLogs: (filter: string) => void;
}

export default function RunInspectorTab({
  runId,
  onFilterLogs,
}: RunInspectorTabProps) {
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { sendJsonMessage } = useWebSocket();
  const { lastJsonMessage } = useSessionStore();
  const commandId = useMemo(() => `history-get-${runId}-${nanoid(5)}`, [runId]);

  useEffect(() => {
    setIsLoading(true);
    // CHANGED: Use the new NOUN.VERB protocol
    sendJsonMessage({
      type: "HISTORY.GET",
      command_id: commandId,
      payload: { run_id: runId },
    });
  }, [runId, sendJsonMessage, commandId]);

  useEffect(() => {
    if (
      lastJsonMessage?.type === "HISTORY.GET_RESULT" &&
      lastJsonMessage.command_id === commandId
    ) {
      const fields = lastJsonMessage.payload.fields as RunDetail | undefined;
      if (fields && fields.run_id) {
        setRunDetail(fields);
      }
      setIsLoading(false);
    }
  }, [lastJsonMessage, commandId]);

  if (isLoading)
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );
  if (!runDetail)
    return (
      <Center h={200}>
        <Text c="red">Could not load details for run {runId}.</Text>
      </Center>
    );

  const getStatusColor = (status: string): MantineColor => {
    const lower = status.toLowerCase();
    if (lower.includes("success") || lower.includes("complete")) return "green";
    if (lower.includes("fail") || lower.includes("error")) return "red";
    return "yellow"; // Default color for other statuses like "pending" or "running"
  };

  return (
    <Box p="md">
      <Group justify="space-between" align="center" mb="lg">
        <Title order={5}>
          Run Details: <Code>{runDetail.run_id}</Code>
        </Title>
        <Button
          variant="light"
          size="xs"
          onClick={() => onFilterLogs(`run_id="${runId}"`)}
          leftSection={<IconFilter size={14} />}
        >
          View All Logs
        </Button>
      </Group>

      {/* ... (Your existing JSX for Parameters, Steps, and Artifacts can go here, it should work as is) ... */}
      {/* Example for Steps section to show wiring */}
      <Title order={5} mt="xl" mb="xs">
        Steps
      </Title>
      {runDetail.steps.map((step) => (
        <Group
          key={step.id}
          justify="space-between"
          className="p-2 border-b border-gray-200 dark:border-gray-800"
        >
          <Text size="sm">
            <Badge
              size="xs"
              variant="outline"
              color={getStatusColor(step.status)}
              mr="xs"
            >
              {step.status}
            </Badge>
            <Code>{step.id}</Code>{" "}
            <Text span c="dimmed">
              ({step.duration_ms}ms)
            </Text>
          </Text>
          {/* CHANGED: This button now calls the onFilterLogs prop */}
          <Button
            variant="subtle"
            size="xs"
            onClick={() =>
              onFilterLogs(`run_id="${runId}", step_id="${step.id}"`)
            }
            leftSection={<IconFilter size={14} />}
          >
            Logs
          </Button>
        </Group>
      ))}
      {/* ... (and so on for Artifacts) ... */}
    </Box>
  );
}
