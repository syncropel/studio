// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/views/DocumentView.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { Box, Loader, Center, Text } from "@mantine/core";
import { nanoid } from "nanoid";

import { useSessionStore } from "@/shared/store/useSessionStore";
import { useUIStateStore } from "@/shared/store/useUIStateStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { useMonacoDecorations } from "../hooks/useMonacoDecorations";
import { registerSemanticFolding } from "../hooks/useSemanticFolding";
import { useMonacoWidgets } from "../hooks/useMonacoWidgets";
import { useFoldingWidgets } from "../hooks/useFoldingWidgets";
import { ContextualPage } from "@/shared/types/notebook";

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
  } = useSessionStore();

  const [content, setContent] = useState<string | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const {
    foldingCommand,
    setFoldingCommand,
    showCommandPalette,
    resetCommandPalette,
  } = useUIStateStore();

  // --- LOGIC DELEGATED TO CUSTOM HOOKS ---
  const editorInstance = isEditorReady ? editorRef.current : null;
  useMonacoDecorations(editorInstance, currentPage, blockResults);
  const outputPortals = useMonacoWidgets(
    editorInstance,
    currentPage,
    blockResults
  );
  const foldingPortals = useFoldingWidgets(editorInstance);
  // --- END ---

  useEffect(() => {
    if (editorInstance && showCommandPalette) {
      log("Executing command: show command palette");
      editorInstance.focus();
      // This is the official, built-in action ID for the command palette
      editorInstance.getAction("editor.action.quickCommand")?.run();

      // CRITICAL: Reset the trigger so it can be fired again.
      resetCommandPalette();
    }
  }, [editorInstance, showCommandPalette, resetCommandPalette]);

  // Effect to handle folding commands from the TopBar
  useEffect(() => {
    if (editorInstance && foldingCommand) {
      log(`Executing folding command from UI store: ${foldingCommand}`);
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

  // Effect to manage the editor's content based on the current state
  // Effect to manage the editor's content based on the current state
  useEffect(() => {
    const welcomePrompt = [
      `// Welcome to Syncropel Studio`,
      `//`,
      `// Press Ctrl+Shift+P or F1 to open the Command Palette to:`,
      `//   - Create a new notebook from an AI prompt`,
      `//   - Create a new blank notebook`,
      `//   - Open a recent file (coming soon)`,
      ``,
      `// Or, select a file from the Workspace navigator on the left.`,
    ].join("\n");

    // --- START: DEFINITIVE FIX FOR STATE SYNC ---
    if (currentPage) {
      // A page is active. The content should come from a PAGE.LOADED event.
      if (
        lastJsonMessage?.type === "PAGE.LOADED" &&
        lastJsonMessage.payload.fields?.content
      ) {
        const newContent = lastJsonMessage.payload.fields.content;
        // Only update if the content is actually different to avoid needless re-renders.
        if (content !== newContent) {
          log(
            "Received new page content from WebSocket. Setting editor value."
          );
          setContent(newContent);
        }
      }
    } else {
      // NO page is active. The editor should ALWAYS show the welcome prompt.
      if (content !== welcomePrompt) {
        log("No current page. Resetting editor to welcome prompt.");
        setContent(welcomePrompt);
      }
    }
    // --- END: DEFINITIVE FIX ---
  }, [lastJsonMessage, currentPage, content]);

  const handleRunBlock = useCallback(
    (blockId: string) => {
      if (!currentPage?.id) return;
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

    // --- COMMAND PALETTE INTEGRATION ---
    editor.addAction({
      id: "syncropel-new-from-ai",
      label: "Syncropel: Create New Notebook from AI Prompt...",
      run: async (ed: monaco.editor.ICodeEditor) => {
        const prompt = window.prompt(
          "Enter your high-level goal for the new notebook (e.g., 'Fetch my GitHub repos and count them by language')"
        );
        if (prompt) {
          log(`Sending PAGE.GENERATE_FROM_PROMPT with prompt: "${prompt}"`);
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
        // --- START: DEFINITIVE FIX FOR NEW NOTEBOOK CONTENT ---
        const newNotebookContent = [
          "---",
          "name: Untitled Python Notebook",
          "description: A new notebook for exploring Python.",
          "---",
          "",
          "# My First Python Block",
          "",
          'This is a simple "Hello, World!" example using a Python block.',
          "",
          "```yaml",
          "cx_block: true",
          `id: hello_world_${nanoid(6)}`, // Use a short unique ID
          "engine: python",
          "name: Say Hello",
          "```",
          "```python",
          'print("Hello, Syncropel!")',
          "```",
        ].join("\n");

        const newPageModel: Partial<ContextualPage> = {
          id: `local-${nanoid()}`,
          name: "Untitled Python Notebook",
          description: "A new notebook for exploring Python.",
          blocks: [
            {
              id: `hello_world_${nanoid(6)}`,
              engine: "python",
              name: "Say Hello",
              content: 'print("Hello, Syncropel!")',
              inputs: [],
              outputs: [],
            },
          ],
        };

        // This is a client-side action
        setCurrentPage(newPageModel as ContextualPage);
        setContent(newNotebookContent);
        // --- END: DEFINITIVE FIX ---
      },
    });

    editor.onMouseDown((e) => {
      /* ... (click handler unchanged) ... */
    });
    editor.onMouseDown((e) => {
      if (!currentPage) return; // Disable gutter clicks in welcome mode
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        e.target.position
      ) {
        const lineNumber = e.target.position.lineNumber;
        const model = editor.getModel();
        if (!model) return;
        if (lineNumber === 1) {
          handleRunPage();
          return;
        }
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
        // This container is now simpler, just providing the border
        className="border-t border-gray-200 dark:border-gray-800"
        style={{ height: "calc(100vh - 50px)" }} // Adjust height to fill space below TopBar
      >
        <Editor
          height="100%" // Editor now fills this container
          language="markdown"
          value={content}
          theme="light"
          onMount={handleEditorDidMount}
          options={{
            readOnly: !currentPage,
            // minimap: { enabled: !currentPage ? false : true },
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

      {/* Portals are now the only other thing rendered */}
      {currentPage && outputPortals}
      {currentPage && foldingPortals}
    </>
  );
}
