"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Box,
  Text,
  Center,
  Group,
  TextInput,
  Button,
  Badge,
  Select,
  Progress,
  Card,
  Stack,
  Modal,
  Code,
  ActionIcon,
  Pill,
  UnstyledButton,
  Divider,
} from "@mantine/core";
import {
  IconFilter,
  IconPlayerPause,
  IconPlayerPlay,
  IconX,
  IconCopy,
  IconDownload,
  IconChevronDown,
} from "@tabler/icons-react";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { LogEventPayload } from "@/shared/api/types";

interface EventsTabProps {
  initialFilter?: string;
}

type LogLevel = "error" | "warn" | "info" | "debug";
type TimeRange = "5m" | "15m" | "1h" | "today" | "all";

interface ActiveProcess {
  runId: string;
  flowId: string;
  currentStep: string;
  progress: number;
  totalSteps: number;
  latestMessage: string;
  timestamp: string;
}

interface EventFilters {
  searchText: string;
  levels: Set<LogLevel>;
  timeRange: TimeRange;
  component: string | null;
  runId: string | null;
}

// Minimalist log line component with inline metadata
const EventLogLine = React.memo(
  ({
    log,
    isHighlighted,
    onClick,
  }: {
    log: LogEventPayload;
    isHighlighted: boolean;
    onClick: () => void;
  }) => {
    const getLogIcon = (level: string) => {
      switch (level) {
        case "error":
          return "❌";
        case "warn":
          return "⚠️";
        case "info":
          return log.message.toLowerCase().includes("success") ||
            log.message.toLowerCase().includes("completed")
            ? "✓"
            : "";
        default:
          return "";
      }
    };

    const getBorderColor = (level: string) => {
      switch (level) {
        case "error":
          return "border-l-red-500";
        case "warn":
          return "border-l-yellow-500";
        case "info":
          return "border-l-blue-500";
        default:
          return "border-l-gray-300";
      }
    };

    const getTextWeight = (level: string) => {
      return level === "error" ? "font-semibold" : "font-normal";
    };

    const getOpacity = (level: string) => {
      return level === "debug" ? "opacity-60" : "opacity-100";
    };

    // Extract metadata for inline display
    const runId = log.fields?.run_id
      ? `..${String(log.fields.run_id).slice(-6)}`
      : null;
    const stepId = log.fields?.step_id
      ? `..${String(log.fields.step_id).slice(-6)}`
      : null;
    const blockId = log.fields?.block_id
      ? String(log.fields.block_id)
      : null;
    const component = log.labels?.component || null;

    return (
      <UnstyledButton
        onClick={onClick}
        className={`w-full text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
          isHighlighted ? "bg-blue-50 dark:bg-blue-950" : ""
        }`}
      >
        <Box
          className={`py-3 px-4 border-l-4 ${getBorderColor(
            log.level
          )} ${getOpacity(log.level)}`}
        >
          <Group wrap="nowrap" gap="md" align="flex-start">
            {/* Timestamp */}
            <Text
              size="xs"
              c="dimmed"
              className="font-mono w-16 flex-shrink-0"
            >
              {new Date(log.timestamp).toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </Text>

            {/* Level Badge */}
            <Badge
              size="sm"
              variant="light"
              color={
                log.level === "error"
                  ? "red"
                  : log.level === "warn"
                  ? "yellow"
                  : log.level === "info"
                  ? "blue"
                  : "gray"
              }
              className="w-16 flex-shrink-0 justify-center"
            >
              {log.level.toUpperCase()}
            </Badge>

            {/* Component */}
            {component && (
              <Text size="sm" c="dimmed" className="w-32 flex-shrink-0">
                {component}
              </Text>
            )}

            {/* Message */}
            <Box className="flex-1 min-w-0">
              <Text
                size="sm"
                className={`${getTextWeight(log.level)} break-words`}
              >
                {getLogIcon(log.level)} {log.message}
              </Text>
              {/* Inline metadata */}
              {(blockId || runId || stepId) && (
                <Group gap="xs" mt={4}>
                  {blockId && (
                    <Text size="xs" c="dimmed" className="font-mono">
                      block: {blockId}
                    </Text>
                  )}
                  {runId && (
                    <Text size="xs" c="dimmed" className="font-mono">
                      run: {runId}
                    </Text>
                  )}
                  {stepId && (
                    <Text size="xs" c="dimmed" className="font-mono">
                      step: {stepId}
                    </Text>
                  )}
                </Group>
              )}
            </Box>

            {/* Expand indicator */}
            <IconChevronDown
              size={16}
              className="text-gray-400 flex-shrink-0 mt-1"
            />
          </Group>
        </Box>
      </UnstyledButton>
    );
  }
);
EventLogLine.displayName = "EventLogLine";

// Active process card component
const ActiveProcessCard = ({ process }: { process: ActiveProcess }) => {
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <Text size="sm" fw={500}>
            ⚙️ {process.flowId}
          </Text>
          <Badge color="blue" variant="light" size="sm">
            Running
          </Badge>
        </Group>
        <Text size="xs" c="dimmed">
          Step {process.progress}/{process.totalSteps}
        </Text>
      </Group>

      <Text size="sm" mb="xs">
        {process.currentStep}
      </Text>

      <Progress
        value={(process.progress / process.totalSteps) * 100}
        size="sm"
        mb="xs"
        animated
      />

      <Group justify="space-between" align="flex-start">
        <Text size="xs" c="dimmed" className="flex-1">
          ┗━ Latest: {process.latestMessage}
        </Text>
        <Text size="xs" c="dimmed">
          {new Date(process.timestamp).toLocaleTimeString()}
        </Text>
      </Group>
    </Card>
  );
};

// Event detail modal
const EventDetailModal = ({
  event,
  opened,
  onClose,
}: {
  event: LogEventPayload | null;
  opened: boolean;
  onClose: () => void;
}) => {
  if (!event) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case "error":
        return "❌";
      case "warn":
        return "⚠️";
      case "info":
        return "✓";
      default:
        return "";
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Text fw={500}>Event Details</Text>
          <ActionIcon variant="subtle" onClick={onClose}>
            <IconX size={16} />
          </ActionIcon>
        </Group>
      }
      size="lg"
    >
      <Stack gap="md">
        {/* Header */}
        <Box>
          <Group gap="xs" mb="xs">
            <Badge
              color={
                event.level === "error"
                  ? "red"
                  : event.level === "warn"
                  ? "yellow"
                  : event.level === "info"
                  ? "blue"
                  : "gray"
              }
            >
              {event.level.toUpperCase()}
            </Badge>
            <Text size="sm" c="dimmed">
              {event.labels?.component || "Unknown"}
            </Text>
            <Text size="sm" c="dimmed">
              {new Date(event.timestamp).toLocaleString()}
            </Text>
          </Group>
          <Text size="md" fw={500}>
            {getLogIcon(event.level)} {event.message}
          </Text>
        </Box>

        {/* Metadata */}
        <Box>
          <Text size="sm" fw={500} mb="xs">
            Metadata
          </Text>
          <Stack gap="xs">
            {event.fields?.run_id && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Run ID:
                </Text>
                <Group gap="xs">
                  <Code>{event.fields.run_id}</Code>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={() =>
                      copyToClipboard(String(event.fields?.run_id))
                    }
                  >
                    <IconCopy size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            )}
            {event.fields?.step_id && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Step ID:
                </Text>
                <Group gap="xs">
                  <Code>{event.fields.step_id}</Code>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={() =>
                      copyToClipboard(String(event.fields?.step_id))
                    }
                  >
                    <IconCopy size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            )}
            {event.fields?.block_id && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Block ID:
                </Text>
                <Group gap="xs">
                  <Code>{event.fields.block_id}</Code>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={() =>
                      copyToClipboard(String(event.fields?.block_id))
                    }
                  >
                    <IconCopy size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            )}
          </Stack>
        </Box>

        {/* Full JSON */}
        <Box>
          <Text size="sm" fw={500} mb="xs">
            Full Event Data
          </Text>
          <Code block>
            {JSON.stringify(
              { labels: event.labels, fields: event.fields },
              null,
              2
            )}
          </Code>
        </Box>

        {/* Actions */}
        <Group justify="flex-end">
          <Button
            variant="light"
            size="sm"
            leftSection={<IconCopy size={16} />}
            onClick={() => copyToClipboard(JSON.stringify(event, null, 2))}
          >
            Copy Event JSON
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

// Main EventsTab component
export default function EventsTab({ initialFilter = "" }: EventsTabProps) {
  const [allEvents, setAllEvents] = useState<LogEventPayload[]>([]);
  const [queuedEvents, setQueuedEvents] = useState<LogEventPayload[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filters, setFilters] = useState<EventFilters>({
    searchText: initialFilter,
    levels: new Set<LogLevel>(),
    timeRange: "all",
    component: null,
    runId: null,
  });
  const [selectedEvent, setSelectedEvent] = useState<LogEventPayload | null>(
    null
  );
  const [modalOpened, setModalOpened] = useState(false);

  const lastJsonMessage = useSessionStore((state) => state.lastJsonMessage);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync initialFilter prop
  useEffect(() => {
    setFilters((prev) => ({ ...prev, searchText: initialFilter }));
  }, [initialFilter]);

  // Handle incoming log events
  useEffect(() => {
    if (lastJsonMessage?.type === "LOG_EVENT") {
      const logEvent = lastJsonMessage.payload as LogEventPayload;

      if (isPaused) {
        setQueuedEvents((prev) => [logEvent, ...prev]);
      } else {
        setAllEvents((prev) => [logEvent, ...prev].slice(0, 500));
      }
    }
  }, [lastJsonMessage, isPaused]);

  // Auto-scroll when not paused
  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [allEvents, isPaused]);

  // Toggle pause/play
  const togglePause = () => {
    if (isPaused) {
      // Resume: dump queued events
      setAllEvents((prev) => [...queuedEvents, ...prev].slice(0, 500));
      setQueuedEvents([]);
    }
    setIsPaused(!isPaused);
  };

  // Extract active processes
  const activeProcesses = useMemo(() => {
    const processMap = new Map<string, ActiveProcess>();

    allEvents.forEach((event) => {
      const runId = event.fields?.run_id as string | undefined;
      const status = event.fields?.status as string | undefined;
      const flowId = event.fields?.flow_id as string | undefined;

      if (runId && status === "running" && flowId) {
        if (!processMap.has(runId)) {
          processMap.set(runId, {
            runId,
            flowId,
            currentStep: event.fields?.block_id as string,
            progress: 1,
            totalSteps: 5, // This should come from the backend
            latestMessage: event.message,
            timestamp: event.timestamp,
          });
        } else {
          const existing = processMap.get(runId)!;
          existing.latestMessage = event.message;
          existing.timestamp = event.timestamp;
          existing.currentStep = event.fields?.block_id as string;
        }
      }
    });

    return Array.from(processMap.values());
  }, [allEvents]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      // Level filter
      if (
        filters.levels.size > 0 &&
        !filters.levels.has(event.level as LogLevel)
      ) {
        return false;
      }

      // Time range filter
      if (filters.timeRange !== "all") {
        const now = new Date();
        const eventTime = new Date(event.timestamp);
        const diffMs = now.getTime() - eventTime.getTime();

        const limits = {
          "5m": 5 * 60 * 1000,
          "15m": 15 * 60 * 1000,
          "1h": 60 * 60 * 1000,
          today: now.setHours(0, 0, 0, 0),
        };

        if (diffMs > limits[filters.timeRange]) {
          return false;
        }
      }

      // Component filter
      if (
        filters.component &&
        event.labels?.component !== filters.component
      ) {
        return false;
      }

      // Run ID filter
      if (filters.runId && event.fields?.run_id !== filters.runId) {
        return false;
      }

      // Search text filter
      if (filters.searchText.trim()) {
        const searchLower = filters.searchText.toLowerCase();
        return event.message.toLowerCase().includes(searchLower);
      }

      return true;
    });
  }, [allEvents, filters]);

  // Get unique components for dropdown
  const uniqueComponents = useMemo(() => {
    const components = new Set<string>();
    allEvents.forEach((event) => {
      if (event.labels?.component) {
        components.add(event.labels.component);
      }
    });
    return Array.from(components).sort();
  }, [allEvents]);

  // Temporal grouping: insert dividers
  const eventsWithDividers = useMemo(() => {
    const result: Array<LogEventPayload | { type: "divider"; time: string }> =
      [];
    let lastTimestamp: Date | null = null;

    filteredEvents.forEach((event) => {
      const currentTimestamp = new Date(event.timestamp);

      if (lastTimestamp) {
        const diffMs = lastTimestamp.getTime() - currentTimestamp.getTime();
        if (diffMs > 2 * 60 * 1000) {
          // 2 minutes gap
          result.push({
            type: "divider",
            time: currentTimestamp.toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
        }
      }

      result.push(event);
      lastTimestamp = currentTimestamp;
    });

    return result;
  }, [filteredEvents]);

  const toggleLevelFilter = (level: LogLevel) => {
    setFilters((prev) => {
      const newLevels = new Set(prev.levels);
      if (newLevels.has(level)) {
        newLevels.delete(level);
      } else {
        newLevels.add(level);
      }
      return { ...prev, levels: newLevels };
    });
  };

  const clearFilters = () => {
    setFilters({
      searchText: "",
      levels: new Set(),
      timeRange: "all",
      component: null,
      runId: null,
    });
  };

  const exportEvents = () => {
    const jsonl = filteredEvents
      .map((event) => JSON.stringify(event))
      .join("\n");
    const blob = new Blob([jsonl], { type: "application/x-ndjson" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `events-${new Date().toISOString()}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header with Live/Pause */}
      <Group
        justify="space-between"
        className="px-4 py-3 border-b border-gray-200 dark:border-gray-800"
      >
        <Group gap="xs">
          <Text size="sm" fw={500}>
            Events
          </Text>
          {!isPaused && (
            <Badge color="green" variant="light" size="sm">
              ⚡ Live ({filteredEvents.length})
            </Badge>
          )}
          {isPaused && queuedEvents.length > 0 && (
            <Badge color="orange" variant="light" size="sm">
              ⏸ Paused ({queuedEvents.length} queued)
            </Badge>
          )}
        </Group>
        <Group gap="xs">
          <Button
            variant="subtle"
            size="xs"
            leftSection={
              isPaused ? <IconPlayerPlay size={14} /> : <IconPlayerPause size={14} />
            }
            onClick={togglePause}
          >
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconDownload size={14} />}
            onClick={exportEvents}
            disabled={filteredEvents.length === 0}
          >
            Export
          </Button>
        </Group>
      </Group>

      {/* Filters */}
      <Box className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 space-y-3">
        <TextInput
          placeholder="Search events..."
          leftSection={<IconFilter size={14} />}
          size="sm"
          value={filters.searchText}
          onChange={(e) => {
            const value = e.currentTarget.value;
            setFilters((prev) => ({ ...prev, searchText: value }));
          }}
        />
        <Group gap="xs">
          <Group gap={4}>
            {(["error", "warn", "info", "debug"] as LogLevel[]).map((level) => (
              <Pill
                key={level}
                size="sm"
                withRemoveButton={filters.levels.has(level)}
                onRemove={() => toggleLevelFilter(level)}
                onClick={() => toggleLevelFilter(level)}
                className="cursor-pointer"
                styles={{
                  root: {
                    backgroundColor: filters.levels.has(level)
                      ? level === "error"
                        ? "#fee2e2"
                        : level === "warn"
                        ? "#fef3c7"
                        : level === "info"
                        ? "#dbeafe"
                        : "#f3f4f6"
                      : "#f9fafb",
                  },
                }}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Pill>
            ))}
          </Group>

          <Select
            placeholder="Time range"
            size="xs"
            value={filters.timeRange}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                timeRange: (value as TimeRange) || "all",
              }))
            }
            data={[
              { value: "5m", label: "Last 5m" },
              { value: "15m", label: "Last 15m" },
              { value: "1h", label: "Last 1h" },
              { value: "today", label: "Today" },
              { value: "all", label: "All" },
            ]}
            className="w-32"
          />

          <Select
            placeholder="Component"
            size="xs"
            value={filters.component}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, component: value }))
            }
            data={[
              { value: "", label: "All" },
              ...uniqueComponents.map((c) => ({ value: c, label: c })),
            ]}
            className="w-40"
            clearable
          />

          {(filters.levels.size > 0 ||
            filters.timeRange !== "all" ||
            filters.component ||
            filters.searchText) && (
            <Button variant="subtle" size="xs" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </Group>
      </Box>

      {/* Content */}
      <Box ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Active Processes Section */}
        {activeProcesses.length > 0 && (
          <Box className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <Text size="xs" fw={600} c="dimmed" mb="md" tt="uppercase">
              Active Processes ({activeProcesses.length})
            </Text>
            <Stack gap="sm">
              {activeProcesses.map((process) => (
                <ActiveProcessCard key={process.runId} process={process} />
              ))}
            </Stack>
          </Box>
        )}

        {/* Event Stream Header */}
        {eventsWithDividers.length > 0 && (
          <Box className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <Text size="xs" fw={600} c="dimmed" tt="uppercase">
              Event Stream
            </Text>
          </Box>
        )}

        {/* Events */}
        {eventsWithDividers.length > 0 ? (
          eventsWithDividers.map((item, index) => {
            if ("type" in item && item.type === "divider") {
              return (
                <Divider
                  key={`divider-${index}`}
                  label={`── ${item.time} ──`}
                  labelPosition="center"
                  my="md"
                  className="opacity-50"
                />
              );
            }

            const event = item as LogEventPayload;
            return (
              <EventLogLine
                key={`${event.timestamp}-${index}`}
                log={event}
                isHighlighted={false}
                onClick={() => {
                  setSelectedEvent(event);
                  setModalOpened(true);
                }}
              />
            );
          })
        ) : (
          <Center h={200}>
            <Stack align="center" gap="xs">
              <Text c="dimmed" size="sm">
                {filters.levels.size > 0 ||
                filters.component ||
                filters.searchText
                  ? "No events matching your filters."
                  : "Waiting for events..."}
              </Text>
              {(filters.levels.size > 0 ||
                filters.component ||
                filters.searchText) && (
                <Button variant="subtle" size="xs" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </Stack>
          </Center>
        )}
      </Box>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setSelectedEvent(null);
        }}
      />
    </Box>
  );
}
