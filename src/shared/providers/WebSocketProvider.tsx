// /home/dpwanjala/repositories/syncropel/studio/src/shared/providers/WebSocketProvider.tsx
"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import useReactWebSocket, { ReadyState } from "react-use-websocket";
import { notifications } from "@mantine/notifications";

import { useConnectionStore } from "@/shared/store/useConnectionStore";
import { useSessionStore } from "@/shared/store/useSessionStore";
import {
  InboundMessage,
  SessionLoadedFields,
  HomepageDataResultFields,
  WorkspaceBrowseResultFields,
  PageLoadedFields,
  PageSavedFields,
  PageStatusFields,
} from "../api/types";

const log = (message: string, ...args: any[]) =>
  console.log(`[WebSocketProvider] ${message}`, ...args);

const readyStateToString = (readyState: ReadyState): string =>
  ({
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState] || "Unknown");

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

  // CHANGED: Get these functions fresh each time by accessing the store directly in the handler
  // instead of extracting them once at the component level
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

          // CHANGED: Get store functions fresh each time
          const {
            setLastJsonMessage,
            setBlockResult,
            setCurrentPage,
            setConnections,
            setVariables,
            handleWorkspaceBrowseResult,
            setHomepageData,
            setSavedPage,
            setPageRunStatus,
          } = useSessionStore.getState();

          setLastJsonMessage(message);
          const { type, payload } = message;
          const fields = payload.fields;

          // CHANGED: Added logging for all message types
          log(`📨 Received message type: ${type}`, fields);

          switch (type) {
            case "BLOCK.STATUS":
            case "BLOCK.OUTPUT":
            case "BLOCK.ERROR":
              if (fields?.block_id) {
                log(`Setting block result for: ${fields.block_id}`, fields);
                setBlockResult(fields.block_id, fields as any);
              }
              break;
            case "PAGE.LOADED":
              log(`📄 PAGE.LOADED received`, fields);
              if (fields) {
                const { initial_model, content } = fields as PageLoadedFields;
                log(`initial_model exists: ${!!initial_model}`);
                log(`content exists: ${!!content}`);
                if (initial_model) {
                  log(
                    `🎯 Setting currentPage with initial_model:`,
                    initial_model
                  );
                  setCurrentPage(initial_model);
                  // CHANGED: Log the state immediately after setting
                  setTimeout(() => {
                    const currentState = useSessionStore.getState().currentPage;
                    log(`✅ currentPage in store after set:`, currentState);
                  }, 0);
                } else {
                  log(`⚠️ No initial_model in PAGE.LOADED message`);
                }
              } else {
                log(`⚠️ No fields in PAGE.LOADED message`);
              }
              break;
            case "PAGE.SAVED":
              if (fields) {
                const { uri, name } = fields as PageSavedFields;
                setSavedPage(uri, name);
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
                if (
                  status.status === "completed" ||
                  status.status === "failed"
                ) {
                  setPageRunStatus(null);
                } else {
                  setPageRunStatus(status);
                }
              }
              break;
            case "SESSION.LOADED":
              if (fields) {
                const { new_session_state } = fields as SessionLoadedFields;
                if (new_session_state) {
                  setConnections(new_session_state.connections);
                  setVariables(new_session_state.variables);
                }
              }
              break;
            case "WORKSPACE.BROWSE_RESULT":
              if (fields) {
                handleWorkspaceBrowseResult(
                  fields as WorkspaceBrowseResultFields
                );
              }
              break;
            case "HOMEPAGE.DATA_RESULT":
              if (fields) {
                setHomepageData(fields as HomepageDataResultFields);
              }
              break;
            case "RUN_HISTORY_RESULT":
            case "RUN_DETAIL_RESULT":
              break;
            case "SYSTEM.ERROR":
              notifications.show({
                title: "Server Error",
                message: payload.message,
                color: "red",
              });
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
