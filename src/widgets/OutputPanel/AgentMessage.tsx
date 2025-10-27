// /home/dpwanjala/repositories/syncropel/studio/src/widgets/OutputPanel/AgentMessage.tsx
"use client";

import React, { useMemo } from "react";
import { Box, Text, Button, Group, Stack } from "@mantine/core";
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconCheck,
  IconX,
  IconRefresh,
  IconEdit,
  IconFileExport,
  IconChevronRight,
} from "@tabler/icons-react";
import MarkdownIt from "markdown-it";
import { AgentResponseAction } from "@/shared/api/types";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";

// Initialize markdown-it once for performance
const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
});

interface AgentMessageProps {
  content: string;
  actions?: AgentResponseAction[];
}

// Icon mapping for common action types (based on label patterns)
const getActionIcon = (label: string) => {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes("run") || lowerLabel.includes("▶️"))
    return <IconPlayerPlay size={12} />;
  if (lowerLabel.includes("pause") || lowerLabel.includes("⏸"))
    return <IconPlayerPause size={12} />;
  if (lowerLabel.includes("fix") || lowerLabel.includes("✅"))
    return <IconCheck size={12} />;
  if (lowerLabel.includes("cancel") || lowerLabel.includes("❌"))
    return <IconX size={12} />;
  if (lowerLabel.includes("rerun") || lowerLabel.includes("🔄"))
    return <IconRefresh size={12} />;
  if (lowerLabel.includes("edit") || lowerLabel.includes("✏️"))
    return <IconEdit size={12} />;
  if (lowerLabel.includes("export") || lowerLabel.includes("⬇"))
    return <IconFileExport size={12} />;
  return <IconChevronRight size={12} />;
};

// Get button variant based on label patterns
const getActionVariant = (label: string): "filled" | "light" | "default" => {
  const lowerLabel = label.toLowerCase();
  if (
    lowerLabel.includes("run") ||
    lowerLabel.includes("fix") ||
    lowerLabel.includes("apply")
  ) {
    return "filled";
  }
  if (lowerLabel.includes("cancel") || lowerLabel.includes("dismiss")) {
    return "default";
  }
  return "light";
};

/**
 * Renders a single message from the AI agent, including formatted markdown
 * and a list of interactive action buttons.
 */
export default function AgentMessage({ content, actions }: AgentMessageProps) {
  const { sendJsonMessage } = useWebSocket();

  // Memoize the rendered HTML to avoid re-rendering on every parent update
  const renderedHtml = useMemo(() => md.render(content), [content]);

  // ✅ FIXED: Added arrow (=>) for arrow function
  const handleActionClick = (action: AgentResponseAction) => {
    if (action.command) {
      console.log(
        "[AgentMessage] Dispatching agent-suggested command:",
        action.command
      );
      sendJsonMessage(action.command);
    } else {
      console.log("[AgentMessage] Non-command action clicked:", action.label);
    }
  };

  return (
    <Box className="border-b border-neutral-100 dark:border-neutral-900">
      <Group gap={6} wrap="nowrap" align="flex-start" px={8} py={6}>
        {/* Agent Avatar - tiny circle */}
        <Box
          className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 
                     flex items-center justify-center text-[9px] font-semibold text-blue-600 dark:text-blue-400"
        >
          S
        </Box>

        <Stack gap={6} className="flex-1 min-w-0">
          {/* Markdown Content - ultra compact */}
          <Box
            className="prose prose-xs dark:prose-invert max-w-none
                       prose-p:my-1 prose-p:leading-relaxed prose-p:text-xs
                       prose-headings:mt-2 prose-headings:mb-1 prose-headings:text-xs
                       prose-ul:my-1 prose-li:my-0 prose-li:text-xs
                       prose-code:text-[10px] prose-code:bg-neutral-100 dark:prose-code:bg-neutral-900
                       prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                       prose-pre:my-1 prose-pre:text-[10px] prose-pre:p-2"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />

          {/* Action Buttons - ultra compact */}
          {actions && actions.length > 0 && (
            <Group gap={4} className="flex-wrap">
              {actions.map((action) => {
                const variant = getActionVariant(action.label);
                return (
                  <Button
                    key={action.id}
                    variant={variant}
                    size="compact-xs"
                    color={variant === "filled" ? "blue" : "gray"}
                    leftSection={getActionIcon(action.label)}
                    onClick={() => handleActionClick(action)}
                    classNames={{
                      root: "h-6 px-2 text-[11px] font-medium",
                      section: "mr-1",
                    }}
                  >
                    {action.label.replace(/[▶️⏸✅❌🔄✏️⬇]/g, "").trim()}
                  </Button>
                );
              })}
            </Group>
          )}
        </Stack>
      </Group>
    </Box>
  );
}
