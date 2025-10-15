"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Title,
  Text,
  Button,
  Group,
  SimpleGrid,
  Badge,
  Loader,
  Center,
} from "@mantine/core";
import { IconFilter, IconDownload, IconEye } from "@tabler/icons-react";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { nanoid } from "nanoid";
import { RunDetail } from "@/shared/api/types";
// --- Import the type from our central location ---

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

  useEffect(() => {
    setIsLoading(true);
    sendJsonMessage({
      type: "GET_RUN_DETAIL",
      command_id: `get-run-detail-${runId}`,
      payload: { run_id: runId },
    });
  }, [runId, sendJsonMessage]);

  useEffect(() => {
    if (
      lastJsonMessage?.command_id === `get-run-detail-${runId}` &&
      lastJsonMessage.type === "RUN_DETAIL_RESULT"
    ) {
      const payload = lastJsonMessage.payload;

      // This type guard now works correctly because TypeScript knows RunDetail is a possible payload type.
      if (payload && typeof payload === "object" && "run_id" in payload) {
        setRunDetail(payload as RunDetail);
      } else {
        console.error(
          `Invalid payload received for RUN_DETAIL_RESULT:`,
          payload
        );
      }

      setIsLoading(false);
    }
  }, [lastJsonMessage, runId]);

  if (isLoading) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );
  }

  if (!runDetail) {
    return (
      <Center h={200}>
        <Text c="red">Could not load details for run {runId}.</Text>
      </Center>
    );
  }

  return (
    <Box p="md">
      <Title order={4} mt="md">
        Run Details:{" "}
        <Text span ff="monospace" fw={400}>
          {runDetail.run_id}
        </Text>
      </Title>

      <SimpleGrid cols={2} mt="md">
        <Text fw={500}>Status:</Text>
        <Badge color={runDetail.status.includes("Success") ? "green" : "red"}>
          {runDetail.status}
        </Badge>
        <Text fw={500}>Flow:</Text>
        <Text size="sm" ff="monospace">
          {runDetail.flow_id}
        </Text>
      </SimpleGrid>

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
            {step.status} {step.id}{" "}
            <Text span c="dimmed">
              ({step.duration_ms}ms)
            </Text>
          </Text>
          <Button
            variant="light"
            size="xs"
            onClick={() =>
              onFilterLogs(`{run_id="${runId}", step_id="${step.id}"}`)
            }
            leftSection={<IconFilter size={14} />}
          >
            View Logs
          </Button>
        </Group>
      ))}

      <Title order={5} mt="xl" mb="xs">
        Artifacts
      </Title>
      {runDetail.artifacts.length > 0 ? (
        runDetail.artifacts.map((art) => (
          <Group key={art.name} justify="space-between" className="p-2">
            <Text size="sm">
              📄 {art.name}{" "}
              <Text span c="dimmed">
                ({(art.size_bytes / 1024).toFixed(2)} KB)
              </Text>
            </Text>
            <Group>
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconEye size={14} />}
              >
                Preview
              </Button>
              <Button
                variant="default"
                size="xs"
                leftSection={<IconDownload size={14} />}
              >
                Download
              </Button>
            </Group>
          </Group>
        ))
      ) : (
        <Text size="sm" c="dimmed">
          No artifacts produced.
        </Text>
      )}
    </Box>
  );
}
