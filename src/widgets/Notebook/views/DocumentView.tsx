// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/views/DocumentView.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { Box, Loader, Center } from "@mantine/core";
import { nanoid } from "nanoid";

import { useSessionStore } from "@/shared/store/useSessionStore";
import { useUIStateStore } from "@/shared/store/useUIStateStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { useMonacoDecorations } from "../hooks/useMonacoDecorations";
import { registerSemanticFolding } from "../hooks/useSemanticFolding";
import { useMonacoWidgets } from "../hooks/useMonacoWidgets";

const log = (message: string, ...args: any[]) =>
  console.log(`[DocumentView] ${message}`, ...args);

export default function DocumentView() {
  const { sendJsonMessage } = useWebSocket();
  const { lastJsonMessage, currentPage, blockResults, pageParameters } =
    useSessionStore();

  // Get the command state and the action to reset it from our UI state store.
  const { foldingCommand, setFoldingCommand } = useUIStateStore();

  const [content, setContent] = useState<string | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const editorInstance = isEditorReady ? editorRef.current : null;
  useMonacoDecorations(editorInstance, currentPage, blockResults);
  const portals = useMonacoWidgets(editorInstance, currentPage, blockResults);

  useEffect(() => {
    if (editorInstance && foldingCommand) {
      log(`Executing folding command: ${foldingCommand}`);

      // Ensure the editor has focus before running a command for reliability.
      editorInstance.focus();

      switch (foldingCommand) {
        case "collapseAll":
          // Use the official 'foldAll' action which works with our custom provider.
          editorInstance.getAction("editor.foldAll")?.run();
          break;
        case "expandAll":
          // --- THE DEFINITIVE, PROVEN FIX for EXPAND ---
          // The 'unfoldAll' action is unreliable with custom providers.
          // Instead, we manually command the editor to unfold every line.
          const model = editorInstance.getModel();
          if (model) {
            const allLineNumbers: number[] = [];
            for (let i = 1; i <= model.getLineCount(); i++) {
              allLineNumbers.push(i);
            }
            log(`Manually expanding all ${allLineNumbers.length} lines.`);
            // The 'unfold' action is smart enough to only act on lines
            // that are currently the start of a folded region.
            editorInstance
              .getAction("editor.unfold")
              ?.run({ selectionLines: allLineNumbers });
          }
          break;
        case "collapseCode":
          // TODO: Implement more granular logic later to distinguish code from metadata.
          // For now, it's an alias for collapseAll.
          editorInstance.getAction("editor.foldAll")?.run();
          break;
      }

      // CRITICAL: Reset the command in the store so it doesn't run again.
      setFoldingCommand(null);
    }
  }, [editorInstance, foldingCommand, setFoldingCommand]);

  // This effect's only job is to manage the editor's raw text content.
  useEffect(() => {
    if (
      lastJsonMessage?.type === "PAGE.LOADED" &&
      lastJsonMessage.payload.fields?.content
    ) {
      const newContent = lastJsonMessage.payload.fields.content;
      if (content !== newContent) {
        log("Received new page content. Setting editor value.");
        setContent(newContent);
      }
    }
    if (!currentPage && content !== null) {
      log("Current page is null. Clearing editor content.");
      setContent(null);
    }
  }, [lastJsonMessage, currentPage, content]);

  const handleRunBlock = useCallback(
    (blockId: string) => {
      if (!currentPage?.id) return;
      log(`User triggered RUN for block: ${blockId}`);
      useSessionStore.getState().setBlockResult(blockId, { status: "pending" });
      const currentBlockState = useSessionStore
        .getState()
        .currentPage?.blocks.find((b) => b.id === blockId);
      sendJsonMessage({
        type: "BLOCK.RUN",
        command_id: `run-block-${nanoid()}`,
        payload: {
          page_id: currentPage.id,
          block_id: blockId,
          content_override: currentBlockState?.content,
          parameters: pageParameters,
        },
      });
    },
    [currentPage, pageParameters, sendJsonMessage]
  );

  const handleRunPage = useCallback(() => {
    log("TODO: User triggered RUN ALL");
  }, []);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    log("Monaco Editor instance has mounted.");
    editorRef.current = editor;
    setIsEditorReady(true);

    registerSemanticFolding(monacoInstance);

    editor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        e.target.position
      ) {
        const lineNumber = e.target.position.lineNumber;
        const model = editor.getModel();
        if (!model) return;

        // --- START: THE DEFINITIVE FIX ---
        // Check if the click was on line 1 for the "Run All" action.
        if (lineNumber === 1) {
          handleRunPage();
          return;
        }
        // --- END: THE DEFINITIVE FIX ---

        // Logic for handling block-level clicks remains the same
        const lineText = model.getLineContent(lineNumber);
        if (lineText.startsWith("```yaml")) {
          let blockId: string | null = null;
          for (
            let j = lineNumber + 1;
            j < lineNumber + 10 && j <= model.getLineCount();
            j++
          ) {
            const innerLine = model.getLineContent(j);
            if (innerLine.startsWith("```")) break;
            const match = innerLine.match(/^\s*id:\s*(\S+)/);
            if (match) {
              blockId = match[1];
              break;
            }
          }
          if (blockId) {
            handleRunBlock(blockId);
          }
        }
      }
    });
  };

  if (!currentPage || content === null) {
    return (
      <Center h="50vh">
        <Loader />
      </Center>
    );
  }

  return (
    <>
      <Box px="xl" pb="xl">
        <Box
          className="border border-gray-200 dark:border-gray-700 rounded-md"
          style={{ minHeight: "90vh" }}
        >
          <Editor
            height="90vh"
            language="markdown"
            value={content}
            theme="light"
            onMount={handleEditorDidMount}
            options={{
              readOnly: false,
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 20, bottom: 20 },
              glyphMargin: true,
              folding: true,
              // Your preferred option is preserved here:
              showFoldingControls: "always",
            }}
          />
        </Box>
      </Box>
      {portals}
    </>
  );
}
