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

          // Get fresh state and actions from all stores within the handler
          const sessionActions = useSessionStore.getState();
          const uiActions = useUIStateStore.getState();
          const settingsState = useSettingsStore.getState();

          const { setInstalledPackages, setAvailablePackages, setRegistries } =
            useSessionStore.getState();

          sessionActions.setLastJsonMessage(message);
          const { type, payload } = message;
          const fields = payload.fields;

          log(`📨 Received message type: ${type}`, fields);

          switch (type) {
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
                uiActions.setIsSaving(false); // Clear the saving state on success
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
                  content: null, // Content will be fetched by React Query on demand
                  type: artifactType,
                });

                // Automatically open the inspector if it isn't already
                if (!settingsState.isInspectorVisible) {
                  settingsState.toggleInspector(true);
                }
              }
              break;

            case "HISTORY.QUERY_RESULT":
              // For now, we'll just log this. The RunsTab will handle its own data.
              log("Received HISTORY.QUERY_RESULT:", fields);
              break;

            case "HISTORY.GET_RESULT":
              // The RunInspectorTab will handle its own data.
              log("Received HISTORY.GET_RESULT:", fields);
              break;

            case "LOGS.QUERY_RESULT":
              // We'll create a store for this later. For now, just log it.
              log("Received LOGS.QUERY_RESULT:", fields);
              break;

            case "SYSTEM.ERROR":
              uiActions.setIsSaving(false); // Also clear saving state on any system error.
              notifications.show({
                title: "Server Error",
                message: payload.message,
                color: "red",
              });
              break;
            case "ECOSYSTEM.INSTALLED_RESULT":
              if (fields) {
                // Cast `fields` to the specific type our action expects.
                setInstalledPackages(
                  fields as {
                    blueprints: EcosystemPackage[];
                    applications: EcosystemPackage[];
                  }
                );
              }
              break;

            case "ECOSYSTEM.REGISTRIES_RESULT":
              if (fields) {
                // Cast `fields` (which is an array in this case)
                setRegistries(fields as EcosystemRegistry[]);
              }
              break;

            case "ECOSYSTEM.PACKAGES_RESULT":
              if (fields) {
                // Cast `fields` to the same shape as the installed packages result.
                setAvailablePackages(
                  fields as {
                    blueprints: EcosystemPackage[];
                    applications: EcosystemPackage[];
                  }
                );
              }
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
          // Ensure spinner stops even if frontend parsing fails
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
