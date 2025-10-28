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
  Paper,
  UnstyledButton,
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
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          maxWidth: "100%",
        }}
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
      style={{
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        maxWidth: "100%",
      }}
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
// CHANGED: Made the layout more compact and minimalistic with cards side by side in a row
// CHANGED: Added top padding and improved active state styling with better instructions
const EmptyState = () => {
  const { outputPanelMode, setOutputPanelMode } = useUIStateStore();
  const isAgent = outputPanelMode === "agent";

  const ModeCard = ({
    icon,
    title,
    description,
    isActive,
    onClick,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <UnstyledButton onClick={onClick} disabled={isActive} style={{ flex: 1 }}>
      <Paper
        p="xs"
        withBorder
        className="transition-all h-full"
        // CHANGED: Using direct style prop instead of mod for guaranteed styling
        style={{
          backgroundColor: isActive
            ? "var(--mantine-color-blue-light)"
            : undefined,
          borderColor: isActive
            ? "var(--mantine-color-blue-filled)"
            : "var(--mantine-color-gray-4)",
          borderWidth: isActive ? "2px" : "1px",
          opacity: isActive ? 1 : 0.7,
        }}
        styles={{
          root: {
            "&:hover": {
              opacity: 1,
              backgroundColor: isActive
                ? "var(--mantine-color-blue-light)"
                : "var(--mantine-color-gray-light-hover)",
            },
          },
        }}
      >
        <Stack gap={4}>
          <Group gap={6}>
            {icon}
            <Text size="sm" fw={isActive ? 600 : 500}>
              {" "}
              {/* CHANGED: Bold font for active card */}
              {title}
            </Text>
          </Group>
          <Text size="xs" c="dimmed" className="leading-tight">
            {description}
          </Text>
        </Stack>
      </Paper>
    </UnstyledButton>
  );

  return (
    <Center className="h-full px-8">
      <Stack
        align="center"
        gap="md"
        className="w-full max-w-2xl"
        style={{ paddingTop: "48px" }}
      >
        <div style={{ display: "flex", gap: "12px", width: "100%" }}>
          <ModeCard
            icon={<IconSparkles size={16} className="text-blue-500" />}
            title="Syncro"
            description="Ask me to create reports, analyze data, or build workflows."
            isActive={isAgent}
            onClick={() => setOutputPanelMode("agent")}
          />
          <ModeCard
            icon={<IconTerminal2 size={16} className="text-gray-600" />}
            title="cx-shell"
            description="Run deterministic commands for flows, connections, and workspace management."
            isActive={!isAgent}
            onClick={() => setOutputPanelMode("cli")}
          />
        </div>
        <Text size="xs" c="dimmed" className="text-center">
          Type{" "}
          <Text component="span" ff="monospace" c="inherit" fw={500}>
            `agent`
          </Text>{" "}
          or{" "}
          <Text component="span" ff="monospace" c="inherit" fw={500}>
            `cli`
          </Text>{" "}
          to switch modes
        </Text>
      </Stack>
    </Center>
  );
};

/**
 * The main view for the "Terminal" tab. It's a unified component that renders
 * the entire conversation history, including agent chats, user prompts,
 * CLI commands, and CLI outputs.
 *
 * CHANGED: Added proper height constraints and flex layout to ensure ScrollArea works correctly
 * and CommandBar always stays visible at the bottom.
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
    // CHANGED: Added explicit flex layout with h-full and overflow-x-hidden to prevent horizontal scrolling
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <ScrollArea
        style={{ flex: 1, minHeight: 0 }}
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
    </div>
  );
}
