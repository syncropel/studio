"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Text,
  Loader,
  Center,
  Code,
  Group,
  Collapse,
  UnstyledButton,
  TextInput,
} from "@mantine/core";
import { IconFilter, IconChevronDown } from "@tabler/icons-react";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { LogEventPayload } from "@/shared/api/types";

// --- START: PROP DEFINITION FIX ---
// Define the props that this component accepts.
interface EventsTabProps {
  initialFilter?: string;
}
// --- END: PROP DEFINITION FIX ---

const LogLine = React.memo(({ log }: { log: LogEventPayload }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getColor = (level: string) => {
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

  return (
    <Box className="p-2 font-mono text-xs border-b border-gray-200 dark:border-gray-800">
      <UnstyledButton
        onClick={() => setIsExpanded((o) => !o)}
        className="w-full"
      >
        <Group wrap="nowrap" justify="space-between">
          <Group wrap="nowrap" gap="sm">
            <Text size="xs" c="dimmed">
              {new Date(log.timestamp).toLocaleTimeString()}
            </Text>
            <Text
              size="xs"
              c={getColor(log.level)}
              fw={700}
              tt="uppercase"
              w={40}
            >
              {log.level}
            </Text>
            <Text className="flex-1 whitespace-pre-wrap">{log.message}</Text>
          </Group>
          <IconChevronDown
            size={14}
            className="text-gray-400 transition-transform"
            style={{
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </Group>
      </UnstyledButton>
      <Collapse in={isExpanded}>
        <Code block mt="xs">
          {JSON.stringify({ labels: log.labels, fields: log.fields }, null, 2)}
        </Code>
      </Collapse>
    </Box>
  );
});
LogLine.displayName = "LogLine";

export default function EventsTab({ initialFilter = "" }: EventsTabProps) {
  const [logEvents, setLogEvents] = useState<LogEventPayload[]>([]);
  const [filter, setFilter] = useState(initialFilter); // Use the prop for initial state
  const lastJsonMessage = useSessionStore((state) => state.lastJsonMessage);
  const scrollRef = useRef<HTMLDivElement>(null);

  // This effect ensures that if the prop changes (e.g., from a "View Logs" button),
  // the filter state updates accordingly.
  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    if (lastJsonMessage?.type === "LOG_EVENT") {
      setLogEvents((prev) =>
        [lastJsonMessage.payload as LogEventPayload, ...prev].slice(0, 500)
      );
    }
  }, [lastJsonMessage]);

  useEffect(() => {
    if (!filter) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [logEvents, filter]);

  const filteredLogs = logEvents.filter((log) => {
    if (!filter.trim()) return true;
    try {
      const filterParts = filter.match(/\{(.+?)\}/g) || [];
      if (filterParts.length > 0) {
        return filterParts.every((part) => {
          const [key, value] = part
            .replace(/[{}]/g, "")
            .split("=")
            .map((s) => s.trim().replace(/"/g, ""));
          return log.labels[key] === value;
        });
      }
      return log.message.toLowerCase().includes(filter.toLowerCase());
    } catch {
      return true;
    }
  });

  return (
    <Box className="h-full flex flex-col">
      <Box className="p-2 border-b border-gray-200 dark:border-gray-800">
        <TextInput
          placeholder='Filter events... (e.g., level="error" or {step_id="my_step"})'
          leftSection={<IconFilter size={14} />}
          size="xs"
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          className="flex-grow"
        />
      </Box>
      <Box ref={scrollRef} className="flex-grow overflow-y-auto">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log, index) => (
            <LogLine key={`${log.timestamp}-${index}`} log={log} />
          ))
        ) : (
          <Center h={100}>
            <Text c="dimmed">Waiting for events...</Text>
          </Center>
        )}
      </Box>
    </Box>
  );
}
