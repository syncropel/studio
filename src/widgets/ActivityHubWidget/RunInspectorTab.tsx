// /home/dpwanjala/repositories/syncropel/studio/src/widgets/ActivityHubWidget/RunInspectorTab.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Text,
  Button,
  Group,
  Loader,
  Center,
  Code,
  Badge,
  MantineColor,
  ActionIcon,
  Tooltip,
  Stack,
  Collapse,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconChartBar,
  IconEye,
  IconDownload,
  IconFileText,
} from "@tabler/icons-react";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { nanoid } from "nanoid";
import {
  InspectedArtifact,
  RunDetail,
  RunDetailArtifact,
} from "@/shared/api/types";
import { useSettingsStore } from "@/shared/store/useSettingsStore";

interface RunInspectorTabProps {
  runId: string;
  onFilterLogs: (filter: string) => void;
}

// CHANGED: Helper to get compact relative time (matching RunsTab style)
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

// CHANGED: Helper to get status emoji (matching RunsTab style)
const getStatusEmoji = (status: string): string => {
  const lower = status.toLowerCase();
  if (lower.includes("success") || lower.includes("complete")) return "✅";
  if (lower.includes("fail") || lower.includes("error")) return "❌";
  if (lower.includes("running") || lower.includes("progress")) return "🔄";
  return "⏳";
};

// CHANGED: Helper to get status color
const getStatusColor = (status: string): MantineColor => {
  const lower = status.toLowerCase();
  if (lower.includes("success") || lower.includes("complete")) return "green";
  if (lower.includes("fail") || lower.includes("error")) return "red";
  if (lower.includes("running") || lower.includes("progress")) return "blue";
  return "yellow";
};

// CHANGED: Helper to format duration compactly
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

// CHANGED: Helper to format file size compactly
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export default function RunInspectorTab({
  runId,
  onFilterLogs,
}: RunInspectorTabProps) {
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // CHANGED: Added state for collapsible sections (Artifacts expanded by default, Steps collapsed)
  const [parametersExpanded, setParametersExpanded] = useState(true);
  const [artifactsExpanded, setArtifactsExpanded] = useState(true);
  const [stepsExpanded, setStepsExpanded] = useState(false);

  const { sendJsonMessage } = useWebSocket();
  const { lastJsonMessage, addInspectedArtifact } = useSessionStore();
  const { isInspectorVisible, toggleInspector } = useSettingsStore(); // +++ NEW: Get inspector state
  const commandId = useMemo(() => `history-get-${runId}-${nanoid(5)}`, [runId]);

  useEffect(() => {
    setIsLoading(true);
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

  const handleDownload = (artifact: RunDetailArtifact) => {
    // The backend provides a relative URL. We construct the full URL.
    // This correctly uses the proxy in development and works directly in production.
    if (artifact.access_url) {
      const fullUrl = new URL(artifact.access_url, window.location.origin);
      window.open(fullUrl, "_blank");
    } else {
      console.error("Artifact has no access_url to download.", artifact);
    }
  };

  const handleView = async (filename: string, artifact: RunDetailArtifact) => {
    if (!artifact.access_url) {
      console.error("Artifact has no access_url to view.", artifact);
      return;
    }

    try {
      // 1. Fetch the content using the Data Plane URL
      const fullUrl = new URL(artifact.access_url, window.location.origin);
      const response = await fetch(fullUrl.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch artifact: ${response.statusText}`);
      }

      // 2. Intelligently parse the content
      let content: any;
      const contentType = artifact.mime_type || "";
      if (contentType.includes("json")) {
        content = await response.json();
      } else {
        content = await response.text();
      }

      // 3. Determine the artifact type for the inspector
      const artifactType = contentType.includes("json")
        ? "json"
        : contentType.startsWith("image/")
        ? "image"
        : "text";

      // 4. Create the InspectedArtifact object and add it to the store
      const inspectedArtifact: InspectedArtifact = {
        id: `run-artifact-${runId}-${filename}`, // A unique ID for this pinned item
        runId: runId,
        artifactName: filename,
        content: content,
        type: artifactType,
      };
      addInspectedArtifact(inspectedArtifact);

      // 5. Automatically open the Inspector if it's closed
      if (!isInspectorVisible) {
        toggleInspector(true);
      }
    } catch (e) {
      console.error("Failed to view artifact:", e);
      // You could show a notification to the user here
    }
  };

  // CHANGED: Calculate stats for footer
  const stats = useMemo(() => {
    if (!runDetail) return null;

    const totalSteps = runDetail.steps?.length || 0;
    const successSteps =
      runDetail.steps?.filter((s) => getStatusEmoji(s.status) === "✅")
        .length || 0;
    const failedSteps =
      runDetail.steps?.filter((s) => getStatusEmoji(s.status) === "❌")
        .length || 0;
    const totalDuration =
      runDetail.steps?.reduce((sum, s) => sum + (s.duration_ms || 0), 0) || 0;

    return {
      totalSteps,
      successSteps,
      failedSteps,
      totalDuration,
      artifactCount: Object.keys(runDetail.artifacts || {}).length,
    };
  }, [runDetail]);

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

  return (
    <Stack gap={0} className="h-full">
      {/* CHANGED: Ultra-compact header with key run info in a single line */}
      <Box
        p="xs"
        className="border-b border-gray-200 dark:border-gray-800 flex-shrink-0"
        style={{ fontSize: "12px" }}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Text size="xs" fw={500}>
              Run:
            </Text>
            <Code style={{ fontSize: "11px" }}>run:{runDetail.run_id}</Code>
            <Badge
              size="sm"
              variant="light"
              color={getStatusColor(runDetail.status)}
              leftSection={
                <Text size="xs">{getStatusEmoji(runDetail.status)}</Text>
              }
            >
              {runDetail.status}
            </Badge>
            <Text size="xs" c="dimmed">
              •
            </Text>
            <Text size="xs" c="dimmed">
              Duration: {formatDuration(stats?.totalDuration || 0)}
            </Text>
            <Text size="xs" c="dimmed">
              •
            </Text>
            <Text size="xs" c="dimmed">
              {getCompactRelativeTime(runDetail.timestamp_utc)}
            </Text>
          </Group>
          <Tooltip label="View All Logs" withArrow>
            <ActionIcon
              variant="light"
              size="sm"
              onClick={() => onFilterLogs(`run_id="${runId}"`)}
            >
              <IconChartBar size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Text size="xs" mt={4} truncate title={runDetail.flow_id}>
          Flow: {runDetail.flow_id}
        </Text>
      </Box>

      {/* CHANGED: Scrollable content area with collapsible sections */}
      <Box className="flex-1 overflow-auto">
        {/* PARAMETERS SECTION */}
        <Box className="border-b border-gray-200 dark:border-gray-800">
          {/* CHANGED: Collapsible header */}
          <UnstyledButton
            onClick={() => setParametersExpanded(!parametersExpanded)}
            className="w-full hover:bg-gray-50 dark:hover:bg-gray-800"
            p="xs"
          >
            <Group justify="space-between">
              <Group gap="xs">
                {parametersExpanded ? (
                  <IconChevronDown size={14} />
                ) : (
                  <IconChevronRight size={14} />
                )}
                <Text size="xs" fw={600}>
                  PARAMETERS ({Object.keys(runDetail.parameters || {}).length})
                </Text>
              </Group>
              <Tooltip label="Copy All" withArrow>
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(
                      JSON.stringify(runDetail.parameters, null, 2)
                    );
                  }}
                >
                  <IconCopy size={12} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </UnstyledButton>

          {/* CHANGED: Collapsible content */}
          <Collapse in={parametersExpanded}>
            <Box px="xs" pb="xs">
              {Object.entries(runDetail.parameters || {}).length > 0 ? (
                Object.entries(runDetail.parameters).map(([key, value]) => (
                  <Group
                    key={key}
                    gap="xs"
                    wrap="nowrap"
                    style={{
                      fontSize: "11px",
                      fontFamily: "monospace",
                      padding: "2px 0",
                    }}
                  >
                    <Text size="xs" c="dimmed" style={{ minWidth: "120px" }}>
                      {key}:
                    </Text>
                    <Text size="xs" style={{ flex: 1, wordBreak: "break-all" }}>
                      {typeof value === "string"
                        ? `"${value}"`
                        : JSON.stringify(value)}
                    </Text>
                  </Group>
                ))
              ) : (
                <Text size="xs" c="dimmed" ta="center" py="xs">
                  No parameters
                </Text>
              )}
            </Box>
          </Collapse>
        </Box>

        {/* ARTIFACTS SECTION - NOW ABOVE STEPS */}
        <Box className="border-b border-gray-200 dark:border-gray-800">
          {/* CHANGED: Collapsible header */}
          <UnstyledButton
            onClick={() => setArtifactsExpanded(!artifactsExpanded)}
            className="w-full hover:bg-gray-50 dark:hover:bg-gray-800"
            p="xs"
          >
            <Group justify="space-between">
              <Group gap="xs">
                {artifactsExpanded ? (
                  <IconChevronDown size={14} />
                ) : (
                  <IconChevronRight size={14} />
                )}
                <Text size="xs" fw={600}>
                  ARTIFACTS ({Object.keys(runDetail.artifacts || {}).length})
                </Text>
              </Group>
            </Group>
          </UnstyledButton>

          {/* CHANGED: Collapsible content with ultra-compact table */}
          <Collapse in={artifactsExpanded}>
            {runDetail.artifacts &&
            Object.keys(runDetail.artifacts).length > 0 ? (
              <Box>
                {/* CHANGED: Table header */}
                <Group
                  gap="xs"
                  wrap="nowrap"
                  px="xs"
                  py={4}
                  className="border-b border-gray-100 dark:border-gray-700"
                  style={{
                    fontSize: "10px",
                    fontFamily: "monospace",
                    fontWeight: 600,
                    color: "var(--mantine-color-dimmed)",
                  }}
                >
                  <Box style={{ flex: 1, minWidth: 0 }}>NAME</Box>
                  <Box style={{ width: "70px", textAlign: "right" }}>SIZE</Box>
                  <Box style={{ width: "60px" }}>TYPE</Box>
                  <Box style={{ width: "80px", textAlign: "right" }}>
                    ACTIONS
                  </Box>
                </Group>

                {/* CHANGED: Table rows */}
                {Object.entries(runDetail.artifacts).map(
                  ([filename, artifact]) => (
                    <Group
                      key={filename} // Use the unique filename as the key
                      gap="xs"
                      wrap="nowrap"
                      px="xs"
                      py={4}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700"
                      style={{
                        fontSize: "11px",
                        fontFamily: "monospace",
                      }}
                    >
                      <Text
                        size="xs"
                        style={{ flex: 1, minWidth: 0 }}
                        truncate
                        title={filename} // The title attribute should be the full filename
                      >
                        <IconFileText
                          size={12}
                          style={{
                            marginRight: "6px",
                            verticalAlign: "middle",
                          }}
                        />
                        {filename}
                      </Text>
                      <Text
                        size="xs"
                        c="dimmed"
                        style={{ width: "70px", textAlign: "right" }}
                      >
                        {artifact.size_bytes
                          ? formatFileSize(artifact.size_bytes)
                          : "-"}
                      </Text>
                      <Badge
                        size="xs"
                        variant="outline"
                        style={{ width: "60px" }}
                        // Show the file extension from the mime_type for better clarity
                        title={artifact.mime_type}
                      >
                        {artifact.mime_type.split("/")[1] ||
                          artifact.type ||
                          "file"}
                      </Badge>
                      <Group
                        gap={4}
                        style={{ width: "80px" }}
                        justify="flex-end"
                      >
                        <Tooltip label="View in Data Tray" withArrow>
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            onClick={() => handleView(filename, artifact)}
                          >
                            <IconEye size={12} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Download" withArrow>
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            onClick={() => handleDownload(artifact)}
                          >
                            <IconDownload size={12} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  )
                )}
              </Box>
            ) : (
              <Text size="xs" c="dimmed" ta="center" py="xs">
                No artifacts generated
              </Text>
            )}
          </Collapse>
        </Box>

        {/* STEPS SECTION - NOW BELOW ARTIFACTS */}
        <Box className="border-b border-gray-200 dark:border-gray-800">
          {/* CHANGED: Collapsible header with summary */}
          <UnstyledButton
            onClick={() => setStepsExpanded(!stepsExpanded)}
            className="w-full hover:bg-gray-50 dark:hover:bg-gray-800"
            p="xs"
          >
            <Group justify="space-between">
              <Group gap="xs">
                {stepsExpanded ? (
                  <IconChevronDown size={14} />
                ) : (
                  <IconChevronRight size={14} />
                )}
                <Text size="xs" fw={600}>
                  STEPS ({runDetail.steps?.length || 0})
                </Text>
                {!stepsExpanded && stats && (
                  <Text size="xs" c="dimmed">
                    - {stats.successSteps}/{stats.totalSteps} succeeded in{" "}
                    {formatDuration(stats.totalDuration)}
                  </Text>
                )}
              </Group>
              {!stepsExpanded && (
                <Text size="xs" c="dimmed">
                  Click to expand
                </Text>
              )}
            </Group>
          </UnstyledButton>

          {/* CHANGED: Collapsible content with ultra-compact table */}
          <Collapse in={stepsExpanded}>
            {runDetail.steps && runDetail.steps.length > 0 ? (
              <Box>
                {/* CHANGED: Table header */}
                <Group
                  gap="xs"
                  wrap="nowrap"
                  px="xs"
                  py={4}
                  className="border-b border-gray-100 dark:border-gray-700"
                  style={{
                    fontSize: "10px",
                    fontFamily: "monospace",
                    fontWeight: 600,
                    color: "var(--mantine-color-dimmed)",
                  }}
                >
                  <Box style={{ flex: 1, minWidth: 0 }}>STEP</Box>
                  <Box style={{ width: "70px", textAlign: "right" }}>
                    RUNTIME
                  </Box>
                  <Box style={{ width: "60px", textAlign: "center" }}>
                    STATUS
                  </Box>
                  <Box style={{ width: "50px", textAlign: "right" }}>LOGS</Box>
                </Group>

                {/* CHANGED: Table rows */}
                {runDetail.steps.map((step) => (
                  <Group
                    key={step.step_id}
                    gap="xs"
                    wrap="nowrap"
                    px="xs"
                    py={4}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700"
                    style={{
                      fontSize: "11px",
                      fontFamily: "monospace",
                    }}
                  >
                    <Text
                      size="xs"
                      style={{ flex: 1, minWidth: 0 }}
                      truncate
                      title={step.step_id}
                    >
                      {step.step_id}
                    </Text>
                    <Text
                      size="xs"
                      c="dimmed"
                      style={{ width: "70px", textAlign: "right" }}
                    >
                      {step.duration_ms
                        ? formatDuration(step.duration_ms)
                        : "-"}
                    </Text>
                    <Box style={{ width: "60px", textAlign: "center" }}>
                      <Text size="sm">{getStatusEmoji(step.status)}</Text>
                    </Box>
                    <Group gap={4} style={{ width: "50px" }} justify="flex-end">
                      <Tooltip label="View Logs" withArrow>
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          onClick={() =>
                            onFilterLogs(
                              `run_id="${runId}", step_id="${step.step_id}"`
                            )
                          }
                        >
                          <IconChartBar size={12} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                ))}
              </Box>
            ) : (
              <Text size="xs" c="dimmed" ta="center" py="xs">
                No steps recorded
              </Text>
            )}
          </Collapse>
        </Box>
      </Box>

      {/* CHANGED: Footer with aggregated stats */}
      {stats && (
        <Box
          p="xs"
          className="border-t border-gray-200 dark:border-gray-800 flex-shrink-0"
        >
          <Text size="xs" c="dimmed" ta="center">
            {formatDuration(stats.totalDuration)} total • {stats.successSteps}/
            {stats.totalSteps} steps ✅ • {stats.artifactCount} artifact
            {stats.artifactCount !== 1 ? "s" : ""} •{" "}
            {stats.failedSteps > 0 ? `${stats.failedSteps} errors` : "0 errors"}
          </Text>
        </Box>
      )}
    </Stack>
  );
}
