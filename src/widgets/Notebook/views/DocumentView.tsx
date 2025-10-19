// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/views/DocumentView.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { Box, Loader, Center } from "@mantine/core";
import { nanoid } from "nanoid";

import { useSessionStore } from "@/shared/store/useSessionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { useMonacoDecorations } from "../hooks/useMonacoDecorations";
import { useMonacoWidgets } from "../hooks/useMonacoWidgets";

const log = (message: string, ...args: any[]) =>
  console.log(`[DocumentView] ${message}`, ...args);

export default function DocumentView() {
  const { sendJsonMessage } = useWebSocket();
  const { lastJsonMessage, currentPage, blockResults, pageParameters } =
    useSessionStore();

  const [content, setContent] = useState<string | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const editorInstance = isEditorReady ? editorRef.current : null;
  useMonacoDecorations(editorInstance, currentPage, blockResults);
  const portals = useMonacoWidgets(editorInstance, currentPage, blockResults);

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

    editor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        e.target.position
      ) {
        const lineNumber = e.target.position.lineNumber;

        if (lineNumber === 2) {
          handleRunPage();
          return;
        }

        const clickedBlock = currentPage?.blocks.find((block) => {
          const match = editor
            .getModel()
            ?.findNextMatch(
              `id: ${block.id}`,
              { lineNumber: 1, column: 1 },
              false,
              true,
              null,
              false
            );
          return match?.range.startLineNumber === lineNumber;
        });

        if (clickedBlock) {
          handleRunBlock(clickedBlock.id);
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
            }}
          />
        </Box>
      </Box>
      {portals}
    </>
  );
}
