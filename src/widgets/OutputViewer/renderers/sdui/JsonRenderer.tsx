"use client";

import React, { useCallback, useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { Loader, Box } from "@mantine/core";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";

/**
 * TypeScript interface for the VFS.GET_ARTIFACT_URL command
 * This command requests a secure, tokenized URL for a file:// URI
 */
interface VFSGetArtifactUrlCommand {
  type: "VFS.GET_ARTIFACT_URL";
  command_id: string;
  payload: {
    uri: string;
  };
}

interface JsonRendererProps {
  data: any;
}

/**
 * JsonRenderer component with integrated VFS file:// link interception.
 *
 * When a user Ctrl+Clicks a file:// URI in the Monaco editor, this component:
 * 1. Intercepts the click before the browser can handle it
 * 2. Sends a VFS.GET_ARTIFACT_URL command to the backend
 * 3. The backend responds with VFS.ARTIFACT_LINK_RESULT
 * 4. The WebSocketProvider automatically handles the response and adds the artifact to the inspector
 *
 * This implements the "Stateless VFS Token Protocol" architecture.
 */
export default function JsonRenderer({ data }: JsonRendererProps) {
  const { sendJsonMessage, readyState } = useWebSocket();

  // Track the editor instance for potential cleanup or future enhancements
  const editorRef = useRef<any>(null);

  /**
   * Request a secure artifact URL from the backend for a given file:// URI.
   * The backend will encrypt the file path into a stateless token and return
   * a VFS.ARTIFACT_LINK_RESULT with the access URL.
   *
   * Note: We don't need to handle the response here because the WebSocketProvider
   * already handles VFS.ARTIFACT_LINK_RESULT messages and automatically adds
   * artifacts to the inspector.
   */
  const requestArtifactUrl = useCallback(
    (fileUri: string) => {
      // Check if we're connected before sending
      if (readyState !== 1) {
        // ReadyState.OPEN = 1
        console.warn(
          `[JsonRenderer] Cannot request artifact - WebSocket not connected`
        );
        return;
      }

      const command: VFSGetArtifactUrlCommand = {
        type: "VFS.GET_ARTIFACT_URL",
        command_id: `vfs-get-url-${nanoid()}`,
        payload: {
          uri: fileUri,
        },
      };

      console.log(
        `[JsonRenderer] Requesting secure artifact URL for: ${fileUri}`
      );
      sendJsonMessage(command);
    },
    [sendJsonMessage, readyState]
  );

  /**
   * Monaco editor mount handler.
   * Registers a custom opener service to intercept file:// URI clicks.
   *
   * This prevents the browser from trying to open file:// URIs (which would fail)
   * and instead triggers our VFS artifact URL request flow.
   */
  const handleEditorDidMount: OnMount = useCallback(
    (editor, monacoInstance) => {
      editorRef.current = editor;

      // FIXED: Access the opener service through the private _openerService property
      // Monaco's TypeScript definitions don't expose getOpenerService() publicly,
      // but it exists at runtime. We use type assertion to access it.
      const openerService = (editor as any)._openerService;

      if (!openerService) {
        console.error("[JsonRenderer] Could not access Monaco opener service");
        return;
      }

      // Register custom opener to intercept link clicks
      // FIXED: Properly type the resource parameter as 'any' to avoid implicit any error
      const openerDisposable = openerService.registerOpener({
        open: (resource: any) => {
          // Only handle file:// scheme URIs
          // Let Monaco handle other schemes (http, https, etc.) normally
          if (resource.scheme !== "file") {
            return false; // false = we didn't handle it, let Monaco try
          }

          // We've intercepted a file:// URI click!
          const fileUri = resource.toString();
          console.log(
            `[JsonRenderer] ✅ Intercepted file:// link click: ${fileUri}`
          );

          // Send the VFS.GET_ARTIFACT_URL command to the backend
          // The WebSocketProvider will automatically handle the response
          // and add the artifact to the inspector
          requestArtifactUrl(fileUri);

          // Return true to indicate we've handled this link
          return true;
        },
      });

      // Cleanup function for the opener disposable
      // Monaco will call this when the editor is unmounted
      return () => {
        if (openerDisposable && openerDisposable.dispose) {
          openerDisposable.dispose();
        }
      };
    },
    [requestArtifactUrl]
  );

  // Prepare the JSON string for display
  const jsonString = JSON.stringify(data, null, 2);
  const lineCount = jsonString.split("\n").length;

  // Calculate dynamic height based on content
  // Minimum 100px, maximum 500px, 19px per line
  const height = Math.min(Math.max(lineCount * 19, 100), 500);

  return (
    <Box className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
      <Editor
        height={`${height}px`}
        language="json"
        value={jsonString}
        theme="light"
        loading={<Loader size="sm" />}
        onMount={handleEditorDidMount}
        options={{
          readOnly: true,
          domReadOnly: true,
          minimap: { enabled: false },
          links: true, // CRITICAL: Enable link detection for file:// URIs
          fontSize: 13,
          lineNumbers: "off",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: "on",
          roundedSelection: false,
          contextmenu: false,
          padding: { top: 10, bottom: 10 },
          folding: true,
          showFoldingControls: "always",
          renderLineHighlight: "none",
          occurrencesHighlight: "off",
        }}
      />
    </Box>
  );
}
