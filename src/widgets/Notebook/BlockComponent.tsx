// /home/dpwanjala/repositories/cx-studio/src/widgets/Notebook/BlockComponent.tsx
"use client";

import React, { useState } from "react";
import {
  Box,
  Paper,
  Text,
  ActionIcon,
  Group,
  Badge,
  Tooltip,
  Textarea,
} from "@mantine/core";
import Editor from "@monaco-editor/react";
import {
  IconPlayerPlay,
  IconSettings,
  IconLoader,
  IconCircleCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { nanoid } from "nanoid";
import YAML from "yaml";
import MarkdownIt from "markdown-it";

import { Block } from "@/shared/types/notebook";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { useSessionStore } from "@/shared/store/useSessionStore";
import OutputViewer from "@/widgets/OutputViewer";

interface BlockComponentProps {
  block: Block;
}

// Instantiate the Markdown renderer once for performance.
const md = new MarkdownIt({ html: true });

export default function BlockComponent({ block }: BlockComponentProps) {
  const { sendJsonMessage } = useWebSocket();
  const {
    currentPage,
    blockResults,
    selectedBlockId,
    setSelectedBlockId,
    updateBlockContent,
    isInspectorVisible,
    toggleInspector,
    pageParameters,
    showCodeBlocks,
    showMarkdownBlocks,
  } = useSessionStore();

  const blockResult = blockResults[block.id];
  const isSelected = selectedBlockId === block.id;

  // State to manage edit mode for Markdown blocks
  const [isEditingMarkdown, setIsEditingMarkdown] = useState(false);

  const handleRun = () => {
    if (!currentPage?.id) return;

    useSessionStore
      .getState()
      .setBlockResult(block.id, { status: "running", payload: null });

    // --- START OF DEFINITIVE FIX ---
    // Find the most up-to-date version of the block from the store
    const currentBlockState = useSessionStore
      .getState()
      .currentPage?.blocks.find((b) => b.id === block.id);

    sendJsonMessage({
      type: "RUN_BLOCK",
      command_id: `run-block-${nanoid()}`,
      payload: {
        page_id: currentPage.id,
        block_id: block.id,
        // Send the current content of the block from the store
        block_content: currentBlockState?.content,
        block_run: currentBlockState?.run,
        parameters: pageParameters,
      },
    });
    // --- END OF DEFINITIVE FIX ---
  };

  const handleInspect = () => {
    // If the inspector is already open and showing this block, close it.
    // Otherwise, select this block and ensure the inspector is open.
    if (isSelected && isInspectorVisible) {
      toggleInspector();
    } else {
      setSelectedBlockId(block.id);
      if (!isInspectorVisible) {
        toggleInspector();
      }
    }
  };

  const getStatusIcon = () => {
    const status = blockResult?.status;
    switch (status) {
      case "running":
        return <IconLoader size={14} className="animate-spin" />;
      case "success":
        return <IconCircleCheck size={14} className="text-green-500" />;
      case "error":
        return <IconAlertCircle size={14} className="text-red-500" />;
      default: // pending or undefined
        return <IconPlayerPlay size={12} />;
    }
  };

  const codeLang =
    block.engine === "sql"
      ? "sql"
      : ["run", "transform", "artifact", "publish"].includes(block.engine)
      ? "yaml"
      : block.engine || "text";

  // --- RENDER MARKDOWN BLOCKS (with View/Edit toggle) ---
  if (block.engine === "markdown") {
    if (!showMarkdownBlocks) return null;
    if (isEditingMarkdown && isSelected) {
      return (
        <Textarea
          defaultValue={block.content || ""}
          onBlur={(e) => {
            updateBlockContent(block.id, e.currentTarget.value);
            setIsEditingMarkdown(false);
          }}
          autosize
          autoFocus
          variant="unstyled"
          className="w-full p-4 my-2 prose dark:prose-invert max-w-none focus:outline-none ring-2 ring-blue-500 rounded-md"
        />
      );
    }

    const htmlContent = md.render(
      block.content || "*Click to edit markdown...*"
    );
    return (
      <Box
        className="prose dark:prose-invert max-w-none mb-xl p-4 rounded-md cursor-text hover:bg-gray-50 dark:hover:bg-gray-900/50"
        onClick={() => {
          setSelectedBlockId(block.id);
          setIsEditingMarkdown(true);
        }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        style={{
          border: isSelected
            ? "1px solid var(--mantine-color-blue-6)"
            : "1px solid transparent",
        }}
      />
    );
  }

  // --- RENDER CODE BLOCKS ---
  // The 'run' property is converted to a YAML string for display and editing.
  const codeToDisplay = block.run
    ? YAML.stringify(block.run)
    : block.content || "";

  return (
    <Paper
      shadow="xs"
      p="md"
      mb="xl"
      withBorder
      onClick={() => setSelectedBlockId(block.id)}
      style={{
        border: isSelected
          ? "1px solid var(--mantine-color-blue-6)"
          : undefined,
      }}
    >
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <Tooltip label="Run Block" position="bottom">
            <ActionIcon
              variant="default"
              onClick={handleRun}
              size="sm"
              loading={blockResult?.status === "running"}
            >
              {getStatusIcon()}
            </ActionIcon>
          </Tooltip>
          <Badge variant="outline" size="xs">
            {block.engine}
          </Badge>
          <Text size="xs" c="dimmed" ff="monospace">
            {block.id}
          </Text>
        </Group>
        <Tooltip label="Inspect Block" position="bottom">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={handleInspect}
          >
            <IconSettings size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
      {showCodeBlocks && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <Editor
            height="150px"
            language={codeLang}
            value={codeToDisplay}
            onChange={(value) => {
              // When the user types, we update the `content` field in the store.
              // When we save, the server will be responsible for parsing this YAML
              // back into a 'run' object if the engine is 'run'.
              updateBlockContent(block.id, value || "");
            }}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: "on",
              scrollBeyondLastLine: false,
              roundedSelection: false,
              padding: { top: 10 },
            }}
          />
        </div>
      )}

      <OutputViewer blockResult={blockResult} />
    </Paper>
  );
}
