"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import useReactWebSocket, { ReadyState } from "react-use-websocket";
import { notifications } from "@mantine/notifications";

// Import the specific stores and types we will interact with
import { useConnectionStore } from "@/shared/store/useConnectionStore";
import { useSessionStore } from "@/shared/store/useSessionStore";
import {
  InboundMessage,
  SessionLoadedFields,
  HomepageDataResultFields,
  WorkspaceBrowseResultFields,
} from "../api/types";
import { ContextualPage } from "../types/notebook";

// Helper for logging connection state (unchanged)
const readyStateToString = (readyState: ReadyState): string => {
  return (
    {
      [ReadyState.CONNECTING]: "Connecting",
      [ReadyState.OPEN]: "Open",
      [ReadyState.CLOSING]: "Closing",
      [ReadyState.CLOSED]: "Closed",
      [ReadyState.UNINSTANTIATED]: "Uninstantiated",
    }[readyState] || "Unknown"
  );
};

// Type definitions (unchanged)
type OutboundMessage = {
  type: string;
  command_id: string;
  payload: Record<string, unknown>;
};

interface WebSocketContextType {
  sendJsonMessage: (jsonMessage: OutboundMessage) => void;
  readyState: ReadyState;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const activeProfile = useConnectionStore((state) => state.getActiveProfile());
  const socketUrl = activeProfile?.url ?? null;

  // Get all necessary state update actions from our sliced stores.
  // This is the core of the new pattern.
  const {
    setLastJsonMessage,
    setBlockResult,
    setCurrentPage,
    setConnections,
    setVariables,
    handleWorkspaceBrowseResult,
    setHomepageData,
  } = useSessionStore.getState(); // Use .getState() for use outside of React components

  const { sendJsonMessage: sendBaseMessage, readyState } =
    useReactWebSocket<InboundMessage>(socketUrl, {
      onOpen: () => {
        const profileName = activeProfile?.name || "server";
        console.log(`[WS] Connection established to ${profileName}.`);
        notifications.hide("ws-conn-error");
        notifications.show({
          id: "ws-conn-success",
          title: "Connected",
          message: `Successfully connected to ${profileName}.`,
          color: "green",
          autoClose: 3000,
        });

        // On successful connection, immediately initialize the session
        sendBaseMessage({
          type: "SESSION.INIT",
          command_id: `session-init-${Date.now()}`,
          payload: {},
        });
      },
      onClose: (event) => {
        const profileName = activeProfile?.name || "server";
        console.warn(
          `[WS] Connection to ${profileName} closed. Clean: ${event.wasClean}, Code: ${event.code}`
        );
        if (activeProfile) {
          notifications.show({
            id: "ws-conn-error",
            title: `Connection to ${profileName} Lost`,
            message: "Attempting to reconnect...",
            color: "red",
            loading: true,
            autoClose: false,
            withCloseButton: false,
          });
        }
      },
      onError: (event) => {
        console.error("[WS] WebSocket error observed:", event);
      },

      // ========================================================================
      //   THE NEW, CENTRALIZED `onMessage` DISPATCHER
      // ========================================================================
      onMessage: (event) => {
        try {
          const message: InboundMessage = JSON.parse(event.data);
          setLastJsonMessage(message);

          const { type, payload } = message;
          const fields = payload.fields;

          switch (type) {
            case "BLOCK.STATUS":
            case "BLOCK.OUTPUT":
            case "BLOCK.ERROR":
              if (fields?.block_id) {
                setBlockResult(fields.block_id, fields as any);
              }
              break;

            case "PAGE.LOADED":
              console.log("[DEBUG] Received PAGE.LOADED. Fields:", fields);
              if (fields) {
                // --- DEFINITIVE FIX ---
                // The `fields` object now contains `initial_model` which is our ContextualPage
                const pageModel = fields.initial_model as
                  | ContextualPage
                  | undefined;
                if (pageModel) {
                  setCurrentPage(pageModel);
                } else {
                  console.error(
                    "Received PAGE.LOADED but initial_model was missing in fields:",
                    fields
                  );
                }
              }
              break;
            case "SESSION.LOADED":
              if (fields) {
                // --- THIS IS THE FIX ---
                // The `fields` object IS the session state.

                const { new_session_state } = fields as SessionLoadedFields;
                if (new_session_state) {
                  setConnections(new_session_state.connections);
                  setVariables(new_session_state.variables);
                }
              }
              break;

            case "WORKSPACE.BROWSE_RESULT":
              if (fields) {
                handleWorkspaceBrowseResult(fields as any);
              }
              break;

            // --- FIX 2: Correct Naming Convention ---
            case "HOMEPAGE.DATA_RESULT":
              if (fields) {
                setHomepageData(fields as HomepageDataResultFields);
              }
              break;

            case "SYSTEM.ERROR":
              notifications.show({
                title: "Server Error",
                message: payload.message,
                color: "red",
              });
              break;

            default:
              console.log(
                `[WS] Received unhandled/log-only event type: ${type}`
              );
          }
        } catch (e) {
          console.error(
            "[WS] Fatal error parsing message:",
            e,
            "Raw data:",
            event.data
          );
        }
      },

      shouldReconnect: () => !!activeProfile,
      reconnectInterval: 3000,
      reconnectAttempts: 10,
      retryOnError: true,
      share: true,
      filter: () => socketUrl !== null,
    });

  useEffect(() => {
    console.log(
      `[WS] Connection state changed to: ${readyStateToString(
        readyState
      )} for URL: ${socketUrl}`
    );
  }, [readyState, socketUrl]);

  const sendMessage = useCallback(
    (message: OutboundMessage) => {
      console.log("[WS] Sending:", message);
      if (readyState === ReadyState.OPEN) {
        sendBaseMessage(message);
      } else {
        console.error(
          "[WS] Attempted to send message while connection was not open."
        );
        notifications.show({
          title: "Connection Error",
          message: "Cannot send command: Not connected to the server.",
          color: "red",
        });
      }
    },
    [readyState, sendBaseMessage]
  );

  const contextValue: WebSocketContextType = {
    sendJsonMessage: sendMessage,
    readyState,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}
