"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { Box, Loader, Center, Text } from "@mantine/core";
import { nanoid } from "nanoid";

import { useSessionStore } from "@/shared/store/useSessionStore";
import { useUIStateStore } from "@/shared/store/useUIStateStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { serializePageToText } from "@/shared/lib/serialization";
import { useMonacoDecorations } from "../hooks/useMonacoDecorations";
import { registerSemanticFolding } from "../hooks/useSemanticFolding";
import { useMonacoWidgets } from "../hooks/useMonacoWidgets";
import { useFoldingWidgets } from "../hooks/useFoldingWidgets";
import { ContextualPage } from "@/shared/types/notebook";
import SaveAsModal, { setEditorInstance } from "@/widgets/SaveAsModal";

const log = (message: string, ...args: any[]) =>
  console.log(`[DocumentView] ${message}`, ...args);

export default function DocumentView() {
  const { sendJsonMessage } = useWebSocket();
  const {
    lastJsonMessage,
    currentPage,
    setCurrentPage,
    blockResults,
    pageParameters,
    setIsDirty,
    clearAllBlockResults,
  } = useSessionStore();

  const [content, setContent] = useState<string | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const {
    foldingCommand,
    setFoldingCommand,
    showCommandPalette,
    resetCommandPalette,
    saveTrigger,
    openModal,
    runAllTrigger,
  } = useUIStateStore();

  const editorInstance = isEditorReady ? editorRef.current : null;
  useMonacoDecorations(editorInstance, currentPage, blockResults);
  const outputPortals = useMonacoWidgets(
    editorInstance,
    currentPage,
    blockResults
  );
  const foldingPortals = useFoldingWidgets(editorInstance);

  useEffect(() => {
    if (saveTrigger > 0) {
      log("Save triggered from UI store.");
      const editor = editorRef.current;
      const page = useSessionStore.getState().currentPage;

      if (editor && page) {
        if (page.id?.startsWith("local-")) {
          openModal({
            title: "Save Notebook As...",
            content: <SaveAsModal />,
            size: "lg",
          });
        } else {
          const currentContent = editor.getValue();
          const serializedContent = serializePageToText(page, currentContent);
          sendJsonMessage({
            type: "PAGE.SAVE",
            command_id: `save-page-${nanoid()}`,
            payload: {
              uri: page.id,
              content: serializedContent,
            },
          });
        }
      }
    }
  }, [saveTrigger, openModal, sendJsonMessage]);

  useEffect(() => {
    if (runAllTrigger > 0) {
      log("Run All triggered from UI store.");
      const page = useSessionStore.getState().currentPage;
      if (page?.id) {
        clearAllBlockResults();
        sendJsonMessage({
          type: "PAGE.RUN",
          command_id: `run-page-${nanoid()}`,
          payload: {
            page_id: page.id,
            parameters: pageParameters,
          },
        });
      }
    }
  }, [runAllTrigger, sendJsonMessage, pageParameters, clearAllBlockResults]);

  useEffect(() => {
    if (editorInstance && showCommandPalette) {
      editorInstance.focus();
      editorInstance.getAction("editor.action.quickCommand")?.run();
      resetCommandPalette();
    }
  }, [editorInstance, showCommandPalette, resetCommandPalette]);

  useEffect(() => {
    if (editorInstance && foldingCommand) {
      editorInstance.focus();
      if (foldingCommand === "collapseAll") {
        editorInstance.getAction("editor.foldAll")?.run();
      } else if (foldingCommand === "expandAll") {
        editorInstance.getAction("editor.unfoldAll")?.run();
      }
      setTimeout(() => {
        const foldingController = (editorInstance as any).getContribution(
          "editor.contrib.folding"
        );
        foldingController?._model?.onDidChange.fire();
      }, 100);
      setFoldingCommand(null);
    }
  }, [editorInstance, foldingCommand, setFoldingCommand]);

  useEffect(() => {
    const welcomePrompt = [
      `// Welcome to Syncropel Studio`,
      `//`,
      `// Press Ctrl+Shift+P or F1 to open the Command Palette to:`,
      `//   - Create a new notebook from an AI prompt`,
      `//   - Create a new blank notebook`,
      ``,
      `// Or, select a file from the Workspace navigator on the left.`,
    ].join("\n");

    if (currentPage) {
      if (
        lastJsonMessage?.type === "PAGE.LOADED" &&
        lastJsonMessage.payload.fields?.content
      ) {
        const newContent = lastJsonMessage.payload.fields.content;
        if (content !== newContent) {
          setContent(newContent);
        }
      }
    } else {
      if (content !== welcomePrompt) {
        setContent(welcomePrompt);
      }
    }
  }, [lastJsonMessage, currentPage, content]);

  const handleRunBlock = useCallback(
    (blockId: string) => {
      // CHANGED: Read currentPage fresh from store instead of using closure
      const currentPage = useSessionStore.getState().currentPage;
      if (!currentPage?.id) {
        log("Cannot run block - no currentPage set");
        return;
      }
      log(`Running block: ${blockId}`);
      useSessionStore.getState().setBlockResult(blockId, { status: "pending" });
      const currentBlockState = useSessionStore
        .getState()
        .currentPage?.blocks.find((b) => b.id === blockId);

      // CHANGED: Also read pageParameters fresh
      const pageParameters = useSessionStore.getState().pageParameters;
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
    [sendJsonMessage] // CHANGED: Removed currentPage and pageParameters from dependencies
  );

  const handleRunPage = useCallback(() => {
    const { triggerRunAll } = useUIStateStore.getState();
    triggerRunAll();
  }, []);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    log("Monaco Editor instance has mounted.");
    editorRef.current = editor;
    setIsEditorReady(true);
    setEditorInstance(editor);

    registerSemanticFolding(monacoInstance);

    editor.addAction({
      id: "syncropel-new-from-ai",
      label: "Syncropel: Create New Notebook from AI Prompt...",
      run: async (ed: monaco.editor.ICodeEditor) => {
        const prompt = window.prompt("Enter your goal for the new notebook...");
        if (prompt) {
          sendJsonMessage({
            type: "PAGE.GENERATE_FROM_PROMPT",
            command_id: `generate-${nanoid()}`,
            payload: { prompt },
          });
        }
      },
    });

    editor.addAction({
      id: "syncropel-new-blank-notebook",
      label: "Syncropel: Create New Blank Notebook",
      run: (ed: monaco.editor.ICodeEditor) => {
        const newNotebookContent = [
          "---",
          "name: Untitled Notebook",
          "description: A new blank notebook.",
          "---",
          "",
          "# New Notebook",
          "",
          "Start by adding a code block or writing some notes.",
        ].join("\n");
        const newPageModel: Partial<ContextualPage> = {
          id: `local-${nanoid()}`,
          name: "Untitled Notebook",
          description: "A new blank notebook.",
          blocks: [],
        };
        setCurrentPage(newPageModel as ContextualPage);
        setContent(newNotebookContent);
        setIsDirty(true);
      },
    });

    // CHANGED: Read currentPage fresh from store in the click handler
    editor.onMouseDown((e) => {
      // CHANGED: Get currentPage fresh from the store, not from closure
      const currentPage = useSessionStore.getState().currentPage;

      log(
        `Mouse down - currentPage exists: ${!!currentPage}, targetType: ${
          e.target.type
        }`
      );

      if (!currentPage || !e.target.position) {
        log("Early return - no currentPage or no position");
        return;
      }

      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position.lineNumber;
        const model = editor.getModel();
        if (!model) return;

        log(`Glyph margin clicked on line ${lineNumber}`);

        // Handle "Run All" button on line 1
        if (lineNumber === 1) {
          log(`Running all blocks`);
          handleRunPage();
          return;
        }

        const lineText = model.getLineContent(lineNumber);

        // Check if this is a YAML block start
        if (lineText.trim().startsWith("```yaml")) {
          log(`Found YAML block start on line ${lineNumber}`);
          let blockId: string | null = null;
          let isCxBlock = false;

          // Scan the next few lines to find the block ID and confirm it's a cx_block
          for (
            let j = lineNumber + 1;
            j < lineNumber + 10 && j <= model.getLineCount();
            j++
          ) {
            const innerLine = model.getLineContent(j);

            if (innerLine.trim().startsWith("```")) break;

            // Check for cx_block flag
            if (innerLine.includes("cx_block: true")) {
              isCxBlock = true;
              log(`Found cx_block flag at line ${j}`);
            }

            const match = innerLine.match(/^\s*id:\s*(\S+)/);
            if (match) {
              blockId = match[1];
              log(`Found block ID: ${blockId}`);
            }

            // Once we have both, we can stop
            if (blockId && isCxBlock) break;
          }

          // Only run if we found a valid cx_block with an ID
          if (blockId && isCxBlock) {
            log(`Calling handleRunBlock with: ${blockId}`);
            handleRunBlock(blockId);
          } else {
            log(`Not running - blockId: ${blockId}, isCxBlock: ${isCxBlock}`);
          }
        }
      }
    });

    editor.onDidChangeModelContent(() => {
      setIsDirty(true);
    });
  };

  if (content === null) {
    return (
      <Center h="90vh">
        <Loader />
      </Center>
    );
  }
  return (
    <>
      <Box
        className="border-t border-gray-200 dark:border-gray-800"
        style={{ height: "calc(100vh - 50px)" }}
      >
        <Editor
          height="100%"
          language="markdown"
          value={content}
          theme="light"
          onMount={handleEditorDidMount}
          options={{
            readOnly: !currentPage,
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 20, bottom: 20 },
            glyphMargin: !!currentPage,
            folding: !!currentPage,
            showFoldingControls: "always",
            lineNumbers: !currentPage ? "off" : "on",
          }}
        />
      </Box>
      {currentPage && outputPortals}
      {currentPage && foldingPortals}
    </>
  );
}
