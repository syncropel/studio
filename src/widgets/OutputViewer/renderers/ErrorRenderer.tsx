// /home/dpwanjala/repositories/syncropel/studio/src/widgets/OutputViewer/renderers/ErrorRenderer.tsx
"use client";

import {
  Alert,
  Accordion,
  Code,
  Button,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { IconAlertTriangle, IconBug } from "@tabler/icons-react";
import { BlockErrorFields } from "@/shared/api/types";
import { useUIStateStore } from "@/shared/store/useUIStateStore";

interface ErrorRendererProps {
  error: BlockErrorFields["error"];
}

/**
 * Parses a raw error message to extract a title and suggest an action.
 * This is a simple heuristic-based parser that can be expanded over time.
 */
const parseError = (message: string) => {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("authentication failed")) {
    return {
      title: "Authentication Failed",
      suggestion: "Please check the connection details for this source.",
      actionLabel: "Manage Connections",
    };
  }
  if (
    lowerMessage.includes("relation") &&
    lowerMessage.includes("does not exist")
  ) {
    return {
      title: "Table or View Not Found",
      suggestion:
        "The specified table could not be found. Check for typos or verify the schema.",
      actionLabel: null,
    };
  }
  if (lowerMessage.includes("syntax error")) {
    return {
      title: "Syntax Error",
      suggestion: "Please review the code in this block for syntax errors.",
      actionLabel: null,
    };
  }
  // Default fallback
  return {
    title: "Execution Error",
    suggestion: "An unexpected error occurred during execution.",
    actionLabel: null,
  };
};

export default function ErrorRenderer({ error }: ErrorRendererProps) {
  const { toggleConnectionManager } = useUIStateStore();
  const { title, suggestion, actionLabel } = parseError(error.message);

  const handleActionClick = () => {
    if (actionLabel === "Manage Connections") {
      toggleConnectionManager(true);
    }
  };

  return (
    <Alert
      variant="light"
      color="red"
      title={title}
      icon={<IconAlertTriangle />}
    >
      <Stack gap="md">
        <Text size="sm">{suggestion}</Text>
        <Text
          ff="monospace"
          size="xs"
          c="red"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {error.message}
        </Text>

        {error.traceback && (
          <Accordion variant="separated" radius="md">
            <Accordion.Item value="traceback">
              <Accordion.Control icon={<IconBug size={16} />}>
                Show Full Traceback
              </Accordion.Control>
              <Accordion.Panel>
                <Code block>{error.traceback}</Code>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        )}

        {actionLabel && (
          <Group justify="flex-start">
            <Button
              variant="light"
              color="red"
              size="xs"
              onClick={handleActionClick}
            >
              {actionLabel}
            </Button>
          </Group>
        )}
      </Stack>
    </Alert>
  );
}
