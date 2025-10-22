// /home/dpwanjala/repositories/syncropel/studio/src/widgets/ActivityHubWidget/RunInspectorTab.tsx
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
  Code,
} from "@mantine/core";
import { IconFilter, IconDownload, IconEye } from "@tabler/icons-react";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { nanoid } from "nanoid";
import { RunDetail, RunDetailResultFields } from "@/shared/api/types";

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
      const fields = lastJsonMessage.payload.fields as
        | RunDetailResultFields
        | undefined;

      if (fields && "run_id" in fields) {
        setRunDetail(fields);
      } else {
        console.error("Invalid payload for RUN_DETAIL_RESULT:", fields);
        setRunDetail(null);
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

  const getStatusColor = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes("success") || lower.includes("complete")) return "green";
    if (lower.includes("fail") || lower.includes("error")) return "red";
    return "yellow";
  };

  return (
    <Box p="md">
      <Group justify="space-between" align="center">
        <Title order={4}>
          Run Details:{" "}
          <Text span ff="monospace" fw={400} size="sm">
            {runDetail.run_id}
          </Text>
        </Title>
        <Button
          variant="light"
          size="xs"
          onClick={() => onFilterLogs(`{run_id="${runId}"}`)}
          leftSection={<IconFilter size={14} />}
        >
          View All Logs for this Run
        </Button>
      </Group>

      <SimpleGrid cols={2} mt="lg" spacing="xs">
        <Text fw={500}>Status:</Text>
        <Badge color={getStatusColor(runDetail.status)}>
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
          <Button
            variant="subtle"
            size="xs"
            onClick={() =>
              onFilterLogs(`{run_id="${runId}", step_id="${step.id}"}`)
            }
            leftSection={<IconFilter size={14} />}
          >
            Logs
          </Button>
        </Group>
      ))}

      <Title order={5} mt="xl" mb="xs">
        Artifacts
      </Title>
      {runDetail.artifacts && runDetail.artifacts.length > 0 ? (
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
                disabled // Preview is a post-MVP feature
              >
                Preview
              </Button>
              <Button
                variant="default"
                size="xs"
                leftSection={<IconDownload size={14} />}
                onClick={() => window.open(art.access_url, "_blank")}
              >
                Download
              </Button>
            </Group>
          </Group>
        ))
      ) : (
        <Text size="sm" c="dimmed" p="xs">
          No artifacts were produced by this run.
        </Text>
      )}
    </Box>
  );
}
