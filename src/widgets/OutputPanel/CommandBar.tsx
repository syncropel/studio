// /home/dpwanjala/repositories/syncropel/studio/src/widgets/OutputPanel/CommandBar.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  TextInput,
  ActionIcon,
  Tooltip,
  Group,
  Text,
  Badge,
  Popover, // ADDED: For context popover
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks"; // ADDED: For popover state management
import {
  IconSend,
  IconPuzzle, // KEPT: Original icon for context button
  IconArrowUp,
  IconArrowDown,
} from "@tabler/icons-react";
import {
  useUIStateStore,
  OutputPanelMode,
} from "@/shared/store/useUIStateStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";
import ContextPopover from "./ContextPopover"; // ADDED: Import the context popover component
import { useSessionStore } from "@/shared/store/useSessionStore";

/**
 * The unified input component for the Output Panel. It handles input for
 * both the AI agent and the traditional CLI, and provides an entry point
 * for attaching context to prompts.
 */
export default function CommandBar() {
  const [inputValue, setInputValue] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  // ADDED: Popover state management
  const [popoverOpened, { open: openPopover, close: closePopover }] =
    useDisclosure(false);

  // Get state and actions from the global UI store
  const {
    outputPanelMode,
    setOutputPanelMode,
    addConversationTurn,
    promptContextPaths,
    setPromptContextPaths, // ADDED: For updating context paths
    conversationHistory,
  } = useUIStateStore();

  const { currentPage } = useSessionStore();

  const { sendJsonMessage } = useWebSocket();
  const isAgentMode = outputPanelMode === "agent";

  // Automatically focus the input when the component mounts or mode changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [outputPanelMode]);

  // ADDED: Handler for context attachment from popover
  const handleAttachContext = (paths: string[]) => {
    setPromptContextPaths(paths);
  };

  // Filter command history for up/down arrows
  const commandHistory = conversationHistory
    .filter((turn) => turn.type === "user_prompt" || turn.type === "cli_input")
    .map((turn) => (turn.type === "user_prompt" ? turn.prompt : turn.content));

  const handleCommandSubmit = () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    // --- Mode Switching Logic ---
    if (!isAgentMode && trimmedInput.toLowerCase() === "agent") {
      setOutputPanelMode("agent");
      setInputValue("");
      return;
    }
    if (isAgentMode && trimmedInput.toLowerCase() === "cli") {
      setOutputPanelMode("cli");
      setInputValue("");
      return;
    }

    // 1. Add the user's turn to the conversation history in the UI.
    addConversationTurn(
      isAgentMode
        ? {
            type: "user_prompt",
            prompt: trimmedInput,
            context_paths: promptContextPaths,
          }
        : { type: "cli_input", content: trimmedInput }
    );

    // 2. Construct and send the fully contextualized WebSocket message.
    if (isAgentMode) {
      sendJsonMessage({
        command_id: `agent-prompt-${nanoid()}`,
        type: "AGENT.PROMPT",
        payload: {
          prompt: trimmedInput,
          // Ephemeral context selected just for this prompt.
          context_paths: promptContextPaths,
          // The ID of the currently open notebook, so the agent knows its primary workspace.
          page_id: currentPage?.id,
          // The ID of the persistent context file attached to this notebook.
          notebook_context_id: currentPage?.notebook_context_id,
        },
      });
    } else {
      sendJsonMessage({
        command_id: `cli-cmd-${nanoid()}`,
        type: "COMMAND.EXECUTE",
        payload: {
          command_text: trimmedInput,
          // Provide the current notebook's URI as the "current working directory" for the command.
          page_id: currentPage?.id,
        },
      });
    }

    // 3. Clean up the UI for the next command.
    setInputValue("");
    setHistoryIndex(-1);
    setPromptContextPaths([]); // Ephemeral context is cleared after each prompt.
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleCommandSubmit();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      if (newIndex >= 0) {
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      setInputValue(
        newIndex >= 0
          ? commandHistory[commandHistory.length - 1 - newIndex]
          : ""
      );
    }
  };

  return (
    <Box
      className="border-t border-neutral-200 dark:border-neutral-800 
                 bg-white dark:bg-neutral-950 flex-shrink-0"
      p={6}
    >
      <Group gap={6} wrap="nowrap" align="center">
        {/* Mode indicator prompt - OUTSIDE the input */}
        <Text
          size="xs"
          className={`font-mono font-semibold select-none flex-shrink-0 ${
            isAgentMode
              ? "text-blue-600 dark:text-blue-400"
              : "text-neutral-500 dark:text-neutral-400"
          }`}
        >
          {isAgentMode ? "agent>" : "cx>"}
        </Text>

        {/* MODIFIED: Context Weaver button with Popover - only in agent mode */}
        {isAgentMode && (
          <Popover
            opened={popoverOpened}
            onChange={openPopover}
            position="top-start"
            withArrow
            shadow="md"
            width={400}
          >
            <Popover.Target>
              <Tooltip
                label="Attach context (⌘K)"
                withArrow
                position="top"
                openDelay={500}
              >
                <ActionIcon
                  variant="subtle"
                  color={promptContextPaths.length > 0 ? "blue" : "gray"}
                  onClick={openPopover}
                  size="sm"
                  className="relative flex-shrink-0"
                >
                  <IconPuzzle size={14} />
                  {/* Badge showing context count */}
                  {promptContextPaths.length > 0 && (
                    <Badge
                      size="xs"
                      variant="filled"
                      color="blue"
                      className="absolute -top-1 -right-1 h-3.5 min-w-[14px] px-1"
                      styles={{
                        root: {
                          fontSize: "8px",
                          lineHeight: "12px",
                          padding: "0 3px",
                        },
                      }}
                    >
                      {promptContextPaths.length}
                    </Badge>
                  )}
                </ActionIcon>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown>
              <ContextPopover
                initialCheckedKeys={promptContextPaths}
                onAttach={handleAttachContext}
                onClose={closePopover}
              />
            </Popover.Dropdown>
          </Popover>
        )}

        {/* Input field - no left section to avoid overlap */}
        <TextInput
          ref={inputRef}
          value={inputValue}
          onChange={(event) => setInputValue(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isAgentMode
              ? "Ask Syncro or type 'cli' to switch..."
              : "Type a command or 'agent' to switch..."
          }
          rightSection={
            <Group gap={4} wrap="nowrap" className="flex-shrink-0">
              {/* Send button */}
              <ActionIcon
                onClick={handleCommandSubmit}
                disabled={!inputValue.trim()}
                variant="filled"
                color={isAgentMode ? "blue" : "gray"}
                size="sm"
                className="transition-all"
              >
                <IconSend size={14} />
              </ActionIcon>
            </Group>
          }
          classNames={{
            root: "flex-1",
            input:
              "font-mono text-xs h-7 border-neutral-200 dark:border-neutral-700 " +
              "focus:border-blue-500 dark:focus:border-blue-500 " +
              "bg-neutral-50 dark:bg-neutral-900",
          }}
          styles={{
            input: {
              paddingLeft: "8px",
              paddingRight: "40px",
              minHeight: "28px",
              height: "28px",
            },
          }}
        />
      </Group>
    </Box>
  );
}
