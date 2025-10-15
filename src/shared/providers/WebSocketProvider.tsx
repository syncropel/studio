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
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useConnectionStore } from "@/shared/store/useConnectionStore";
import { InboundMessage, LogEventPayload } from "../api/types";

// Helper to get a descriptive string for the ReadyState enum
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

// --- TYPE DEFINITIONS ---
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
  const getActiveProfile = useConnectionStore(
    (state) => state.getActiveProfile
  );
  const activeProfile = getActiveProfile();

  // --- START: DEFINITIVE CONNECTION LOGIC ---
  // This IIFE (Immediately Invoked Function Expression) cleanly determines the correct URL.
  const socketUrl = activeProfile?.url ?? null;
  // --- END: DEFINITIVE CONNECTION LOGIC ---

  const { setLastJsonMessage, setBlockResult } = useSessionStore();

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
      },
      onClose: (event) => {
        const profileName = activeProfile?.name || "server";
        console.warn(
          `[WS] Connection to ${profileName} closed. Clean: ${event.wasClean}, Code: ${event.code}`
        );
        // Don't show the reconnecting notification if we intentionally disconnected
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
      onMessage: (event) => {
        try {
          const parsedData: InboundMessage = JSON.parse(event.data);

          // Always pass the raw message to the session store for the Events tab to consume.
          setLastJsonMessage(parsedData);

          // --- START: DEFINITIVE FIX FOR BLOCK STATUS TRANSLATION ---
          // Check if this is a log event that also represents a block's execution status.
          if (parsedData.type === "LOG_EVENT") {
            const log = parsedData.payload as LogEventPayload;

            // We only care about events from the ScriptEngine that have a block_id and a status.
            const blockId = log.fields?.block_id;
            const status = log.fields?.status;

            if (log.labels.component === "ScriptEngine" && blockId && status) {
              if (status === "success") {
                const result = log.fields?.result;
                console.log(`[WS] Translating SUCCESS for block: ${blockId}`);
                setBlockResult(blockId, { status: "success", payload: result });
              } else if (status === "error") {
                const error = log.fields?.error;
                console.log(`[WS] Translating ERROR for block: ${blockId}`);
                setBlockResult(blockId, {
                  status: "error",
                  payload: { error },
                });
              } else {
                // This will handle the 'running' status.
                console.log(
                  `[WS] Translating status '${status}' for block: ${blockId}`
                );
                setBlockResult(blockId, { status: status, payload: null });
              }
            }
          }
          // --- END: DEFINITIVE FIX ---
        } catch (e) {
          console.error("[WS] Error parsing message:", e);
        }
      },
      // --- Reconnection & Stability Options ---
      shouldReconnect: () => !!activeProfile, // Only attempt to reconnect if a profile is active
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
