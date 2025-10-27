// /home/dpwanjala/repositories/syncropel/studio/src/widgets/OutputPanel/TerminalView.tsx
"use client";

import React, { useEffect, useRef } from "react";
import {
  Box,
  ScrollArea,
  Stack,
  Group,
  Text,
  Center,
  Button,
} from "@mantine/core";
import { IconSparkles, IconTerminal2 } from "@tabler/icons-react";
import {
  useUIStateStore,
  ConversationTurn,
} from "@/shared/store/useUIStateStore";
import CommandBar from "./CommandBar";
import AgentMessage from "./AgentMessage";

// --- Sub-Component for User Prompts ---
const UserPromptMessage = ({
  turn,
}: {
  turn: Extract<ConversationTurn, { type: "user_prompt" }>;
}) => (
  <Box className="border-b border-neutral-100 dark:border-neutral-900">
    <Group
      gap={6}
      wrap="nowrap"
      align="flex-start"
      px={8}
      py={6}
      className="bg-neutral-50/50 dark:bg-neutral-900/30"
    >
      {/* User indicator - tiny circle */}
      <Box
        className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 
                   flex items-center justify-center text-[9px] font-medium text-neutral-600 dark:text-neutral-400"
      >
        U
      </Box>

      <Stack gap={2} className="flex-1 min-w-0">
        {/* The prompt text */}
        <Text
          size="xs"
          className="text-neutral-800 dark:text-neutral-200 leading-relaxed"
          style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        >
          {turn.prompt}
        </Text>

        {/* Context indicator - only if context was attached */}
        {turn.context_paths && turn.context_paths.length > 0 && (
          <Group gap={3} className="flex-wrap">
            {turn.context_paths.map((path, idx) => (
              <Text
                key={idx}
                size="xs"
                className="px-1 py-0.5 rounded text-[10px] bg-blue-50 dark:bg-blue-950 
                           text-blue-700 dark:text-blue-300 font-mono"
              >
                {path.split("/").pop()?.split("?")[0] || path}
              </Text>
            ))}
          </Group>
        )}
      </Stack>
    </Group>
  </Box>
);

// --- Sub-Component for CLI Input ---
const CliInputMessage = ({
  turn,
}: {
  turn: Extract<ConversationTurn, { type: "cli_input" }>;
}) => (
  <Box
    px={8}
    py={4}
    className="font-mono text-xs border-b border-neutral-100 dark:border-neutral-900"
  >
    <Text component="span" c="dimmed" className="select-none">
      cx&gt;{" "}
    </Text>
    <Text component="span" className="text-neutral-800 dark:text-neutral-200">
      {turn.content}
    </Text>
  </Box>
);

// --- Sub-Component for CLI Output (with "Golden Link" logic) ---
const CliOutputMessage = ({
  turn,
}: {
  turn: Extract<ConversationTurn, { type: "cli_output" }>;
}) => {
  const { addOutputPanelTab } = useUIStateStore();

  // If there's an interactive run_id, make it clickable (Golden Link)
  if (turn.interactive_run_id) {
    const parts = turn.content.split(turn.interactive_run_id);
    return (
      <Box
        px={8}
        py={4}
        className="font-mono text-xs text-neutral-700 dark:text-neutral-300 
                   border-b border-neutral-100 dark:border-neutral-900"
        style={{ whiteSpace: "pre-wrap" }}
      >
        {parts[0]}
        <Button
          variant="subtle"
          size="compact-xs"
          className="inline-block mx-1 font-mono text-blue-600 dark:text-blue-400 
                     hover:underline cursor-pointer h-4 px-1"
          onClick={() =>
            addOutputPanelTab(`run-detail-${turn.interactive_run_id}`)
          }
        >
          {turn.interactive_run_id}
        </Button>
        {parts[1]}
      </Box>
    );
  }

  return (
    <Box
      px={8}
      py={4}
      className="font-mono text-xs text-neutral-700 dark:text-neutral-300 
                 border-b border-neutral-100 dark:border-neutral-900"
      style={{ whiteSpace: "pre-wrap" }}
    >
      {turn.content}
    </Box>
  );
};

// --- Sub-Component for Mode Switch Separator ---
const ModeSwitchMessage = ({
  turn,
}: {
  turn: Extract<ConversationTurn, { type: "mode_switch" }>;
}) => {
  const isAgent = turn.newMode === "agent";
  return (
    <Box className="border-b border-neutral-100 dark:border-neutral-900" py={4}>
      <Group gap={4} justify="center">
        {isAgent ? (
          <IconSparkles size={12} className="text-blue-500" />
        ) : (
          <IconTerminal2 size={12} className="text-neutral-500" />
        )}
        <Text size="xs" c="dimmed" className="font-medium">
          {isAgent ? "Agent mode" : "CLI mode"}
        </Text>
      </Group>
    </Box>
  );
};

// --- Empty State ---
const EmptyState = () => {
  const { outputPanelMode } = useUIStateStore();
  const isAgent = outputPanelMode === "agent";

  return (
    <Center className="h-full px-4">
      <Stack align="center" gap="sm" className="max-w-xs">
        {isAgent ? (
          <>
            <Box
              className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950 
                         flex items-center justify-center"
            >
              <IconSparkles size={20} className="text-blue-600" />
            </Box>
            <Stack gap={2} align="center">
              <Text
                size="sm"
                fw={600}
                className="text-neutral-800 dark:text-neutral-200"
              >
                Syncro Agent
              </Text>
              <Text size="xs" c="dimmed" className="text-center">
                Ask me to create reports, analyze data, or build workflows.
              </Text>
              <Text size="xs" c="dimmed" className="text-center mt-2">
                Type{" "}
                <Text
                  component="span"
                  ff="monospace"
                  fw={500}
                  className="text-neutral-600 dark:text-neutral-400"
                >
                  cli
                </Text>{" "}
                to switch modes
              </Text>
            </Stack>
          </>
        ) : (
          <>
            <Box
              className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 
                         flex items-center justify-center"
            >
              <IconTerminal2 size={20} className="text-neutral-600" />
            </Box>
            <Stack gap={2} align="center">
              <Text
                size="sm"
                fw={600}
                className="text-neutral-800 dark:text-neutral-200"
              >
                CLI Mode
              </Text>
              <Text size="xs" c="dimmed" className="text-center">
                Execute commands for flows, notebooks, and data.
              </Text>
              <Text size="xs" c="dimmed" className="text-center mt-2">
                Type{" "}
                <Text
                  component="span"
                  ff="monospace"
                  fw={500}
                  className="text-neutral-600 dark:text-neutral-400"
                >
                  agent
                </Text>{" "}
                to switch modes
              </Text>
            </Stack>
          </>
        )}
      </Stack>
    </Center>
  );
};

/**
 * The main view for the "Terminal" tab. It's a unified component that renders
 * the entire conversation history, including agent chats, user prompts,
 * CLI commands, and CLI outputs.
 */
export default function TerminalView() {
  const viewport = useRef<HTMLDivElement>(null);
  const conversationHistory = useUIStateStore(
    (state) => state.conversationHistory
  );

  // Auto-scroll to the bottom of the history on new messages
  useEffect(() => {
    viewport.current?.scrollTo({
      top: viewport.current.scrollHeight,
      behavior: "smooth",
    });
  }, [conversationHistory.length]);

  return (
    <Stack gap={0} className="h-full bg-white dark:bg-neutral-950">
      <ScrollArea
        className="flex-1"
        viewportRef={viewport}
        styles={{
          viewport: {
            "& > div": {
              display: "block !important",
            },
          },
        }}
      >
        {conversationHistory.length > 0 ? (
          <Box>
            {conversationHistory.map((turn, index) => {
              switch (turn.type) {
                case "agent_response":
                  return <AgentMessage key={index} {...turn} />;
                case "user_prompt":
                  return <UserPromptMessage key={index} turn={turn} />;
                case "cli_input":
                  return <CliInputMessage key={index} turn={turn} />;
                case "cli_output":
                  return <CliOutputMessage key={index} turn={turn} />;
                case "mode_switch":
                  return <ModeSwitchMessage key={index} turn={turn} />;
                default:
                  return null;
              }
            })}
          </Box>
        ) : (
          <EmptyState />
        )}
      </ScrollArea>

      <CommandBar />
    </Stack>
  );
}
