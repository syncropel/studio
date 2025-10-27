// /home/dpwanjala/repositories/syncropel/studio/src/shared/providers/WebSocketProvider.tsx
"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import useReactWebSocket, { ReadyState } from "react-use-websocket";
import { notifications } from "@mantine/notifications";
import { nanoid } from "nanoid";

import { useConnectionStore } from "@/shared/store/useConnectionStore";
import {
  EcosystemPackage,
  EcosystemRegistry,
  useSessionStore,
} from "@/shared/store/useSessionStore";
import { useUIStateStore } from "@/shared/store/useUIStateStore";
import { useSettingsStore } from "@/shared/store/useSettingsStore";
import {
  InboundMessage,
  SessionLoadedFields,
  HomepageDataResultFields,
  WorkspaceBrowseResultFields,
  PageLoadedFields,
  PageSavedFields,
  PageStatusFields,
  VfsArtifactLinkResultFields,
  AgentResponseFields,
} from "../api/types";

const log = (message: string, ...args: any[]) =>
  console.log(`[WebSocketProvider] ${message}`, ...args);

type OutboundMessage = {
  type: string;
  command_id: string;
  payload: Record<string, unknown>;
};

interface WebSocketContextType {
  sendJsonMessage: (jsonMessage: OutboundMessage) => void;
  readyState: ReadyState;
  isReconnecting: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

const MAX_RECONNECT_ATTEMPTS = 3;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const activeProfile = useConnectionStore((state) => state.getActiveProfile());
  const socketUrl = activeProfile?.url ?? null;
  const hasAttemptedConnection = useRef(false);

  log(`Provider rendered. Active profile:`, activeProfile);
  log(`Attempting to connect to URL: ${socketUrl}`);

  const { sendJsonMessage: sendBaseMessage, readyState } =
    useReactWebSocket<InboundMessage>(socketUrl, {
      onOpen: () => {
        log("✅ onOpen: Connection established.");
        hasAttemptedConnection.current = true;
        notifications.hide("ws-reconnect-error");
        notifications.show({
          id: "ws-conn-success",
          title: "Connected",
          message: `Successfully connected to ${
            activeProfile?.name || "server"
          }.`,
          color: "green",
          autoClose: 3000,
        });
        sendBaseMessage({
          type: "SESSION.INIT",
          command_id: `session-init-${Date.now()}`,
          payload: {},
        });
      },
      onClose: (event) => {
        log(`❌ onClose: Connection closed. Was clean: ${event.wasClean}`);
        if (activeProfile && !event.wasClean) {
          hasAttemptedConnection.current = true;
          notifications.show({
            id: "ws-reconnect-error",
            title: `Connection to ${activeProfile.name} Lost`,
            message: "Attempting to reconnect...",
            color: "red",
            loading: true,
            autoClose: false,
            withCloseButton: false,
          });
        }
      },
      onReconnectStop: () => {
        log(
          `🛑 onReconnectStop: All ${MAX_RECONNECT_ATTEMPTS} reconnect attempts failed.`
        );
        notifications.update({
          id: "ws-reconnect-error",
          title: "Connection Failed",
          message: "Could not reconnect to the server.",
          loading: false,
          color: "red",
        });
      },
      onError: (event) => {
        log("🔥 onError: WebSocket error observed.", event);
      },
      onMessage: (event) => {
        try {
          const message: InboundMessage = JSON.parse(event.data);

          // Get fresh state and actions from all stores as needed.
          const sessionActions = useSessionStore.getState();
          const uiActions = useUIStateStore.getState();
          const settingsState = useSettingsStore.getState();

          // Always store the last message for debugging and for hooks that need it.
          sessionActions.setLastJsonMessage(message);

          const { type, payload } = message;
          const fields = payload.fields;

          log(`📨 Received message type: ${type}`, fields);

          switch (type) {
            // --- UNIFIED TERMINAL / AGENT HANDLERS ---

            case "COMMAND.RESULT":
              if (fields?.result) {
                // Parse for a run_id to make the output interactive (the "golden link").
                const runIdMatch = String(fields.result).match(
                  /Run ID: \[ (run_[a-zA-Z0-9]+) \]/
                );
                uiActions.addConversationTurn({
                  type: "cli_output",
                  content: fields.result,
                  interactive_run_id: runIdMatch ? runIdMatch[1] : undefined,
                });
              }
              break;

            case "AGENT.THOUGHT":
              if (fields?.content) {
                uiActions.addConversationTurn({
                  type: "agent_response",
                  content: `*${fields.content}*`, // Italicize for "thinking" style
                });
              }
              break;

            case "AGENT.RESPONSE":
              if (fields) {
                uiActions.addConversationTurn({
                  type: "agent_response",
                  ...(fields as AgentResponseFields),
                });
              }
              break;

            case "SYSTEM.ERROR":
              // This error can be a response to either a CLI or Agent command.
              // We render it as a standard CLI error for consistency in the terminal.
              uiActions.addConversationTurn({
                type: "cli_output",
                content: `Error: ${payload.message}`,
              });
              uiActions.setIsSaving(false); // Also clear saving state on any system error
              break;

            // --- CORE APPLICATION EVENT HANDLERS ---

            case "BLOCK.STATUS":
            case "BLOCK.OUTPUT":
            case "BLOCK.ERROR":
              if (fields?.block_id) {
                sessionActions.setBlockResult(fields.block_id, fields as any);
              }
              break;

            case "PAGE.LOADED":
              if (fields) {
                const { initial_model } = fields as PageLoadedFields;
                if (initial_model) {
                  sessionActions.setCurrentPage(initial_model);
                }
              }
              break;

            case "PAGE.SAVED":
              if (fields) {
                const { uri, name } = fields as PageSavedFields;
                sessionActions.setSavedPage(uri, name);
                uiActions.setIsSaving(false);
                notifications.show({
                  title: "Saved",
                  message: `Notebook '${name}' saved successfully.`,
                  color: "green",
                  autoClose: 2000,
                });
              }
              break;

            case "PAGE.STATUS":
              if (fields) {
                const status = fields as PageStatusFields;
                sessionActions.setPageRunStatus(
                  status.status === "completed" || status.status === "failed"
                    ? null
                    : status
                );
              }
              break;

            case "SESSION.LOADED":
              if (fields) {
                const { new_session_state } = fields as SessionLoadedFields;
                if (new_session_state) {
                  sessionActions.setConnections(new_session_state.connections);
                  sessionActions.setVariables(new_session_state.variables);
                }
              }
              break;

            case "WORKSPACE.BROWSE_RESULT":
              if (fields) {
                sessionActions.handleWorkspaceBrowseResult(
                  fields as WorkspaceBrowseResultFields
                );
              }
              break;

            case "HOMEPAGE.DATA_RESULT":
              if (fields) {
                sessionActions.setHomepageData(
                  fields as HomepageDataResultFields
                );
              }
              break;

            case "VFS.ARTIFACT_LINK_RESULT":
              if (fields) {
                const dataRef = fields as VfsArtifactLinkResultFields;
                const artifactName =
                  dataRef.access_url.split("/").pop() || "VFS File";
                const artifactType = dataRef.renderer_hint as any;

                sessionActions.addInspectedArtifact({
                  id: `vfs-${dataRef.artifact_id}`,
                  runId: "vfs-inspector",
                  artifactName: artifactName,
                  content: null,
                  type: artifactType,
                });

                if (!settingsState.isInspectorVisible) {
                  settingsState.toggleInspector(true);
                }
              }
              break;

            case "HISTORY.QUERY_RESULT":
            case "HISTORY.GET_RESULT":
            case "LOGS.QUERY_RESULT":
              // These events are now primarily handled by the components that
              // request them (via `lastJsonMessage`). No specific global state
              // change is needed here, but we log it for debugging.
              log(`Received data query result: ${type}`);
              break;

            case "ECOSYSTEM.INSTALLED_RESULT":
            case "ECOSYSTEM.REGISTRIES_RESULT":
            case "ECOSYSTEM.PACKAGES_RESULT":
              // These events are handled by the EcosystemView via `lastJsonMessage`.
              log(`Received ecosystem data: ${type}`);
              break;

            default:
              log(`⚠️ Unknown message type: ${type}`);
          }
        } catch (e) {
          console.error(
            "[WS] Error parsing message:",
            e,
            "Raw data:",
            event.data
          );
          // Ensure spinner stops even if frontend parsing fails, as a safety net.
          useUIStateStore.getState().setIsSaving(false);
        }
      },
      shouldReconnect: () => !!activeProfile,
      reconnectInterval: 3000,
      reconnectAttempts: MAX_RECONNECT_ATTEMPTS,
      retryOnError: true,
      share: true,
      filter: () => socketUrl !== null,
    });

  const isReconnecting =
    hasAttemptedConnection.current && readyState === ReadyState.CONNECTING;

  const sendMessage = useCallback(
    (message: OutboundMessage) => {
      if (readyState === ReadyState.OPEN) {
        log(`📤 Sending message:`, message);
        sendBaseMessage(message);
      } else {
        log(
          `❌ Cannot send message - not connected. ReadyState: ${readyState}`
        );
        notifications.show({
          title: "Connection Error",
          message: "Not connected to the server.",
          color: "red",
        });
      }
    },
    [readyState, sendBaseMessage]
  );

  const contextValue: WebSocketContextType = {
    sendJsonMessage: sendMessage,
    readyState,
    isReconnecting,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context)
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  return context;
}
