// /home/dpwanjala/repositories/cx-studio/src/shared/providers/WebSocketProvider.tsx
"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import useReactWebSocket, { ReadyState } from "react-use-websocket";
import { notifications } from "@mantine/notifications";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { InboundMessage, ErrorPayload } from "@/shared/types/server";

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

// Centralized logger for consistent formatting
const logger = (...args: unknown[]) =>
  console.log("%c[WS Provider]", "color: purple; font-weight: bold;", ...args);

const CX_SERVER_URL = "ws://127.0.0.1:8888/ws";

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { setLastJsonMessage, setBlockResult } = useSessionStore();

  const { sendJsonMessage: sendBaseMessage, readyState } =
    useReactWebSocket<InboundMessage>(CX_SERVER_URL, {
      onOpen: () => logger("✅ WebSocket connection established."),
      onClose: () => {
        logger("❌ WebSocket connection closed. Attempting to reconnect...");
        notifications.show({
          id: "ws-conn-error",
          title: "Connection Lost",
          message: "Attempting to reconnect to the cx-server...",
          color: "red",
          loading: true,
          autoClose: false,
          withCloseButton: false,
        });
      },
      onMessage: (event) => {
        logger("🚀 MESSAGE RECEIVED FROM SERVER:", event.data);
        try {
          const parsedData: InboundMessage = JSON.parse(event.data);

          if (parsedData.type === "BLOCK_RESULT") {
            const { block_id, result } = parsedData.payload as any;
            setBlockResult(block_id, { status: "success", payload: result });
          } else if (parsedData.type === "BLOCK_STATUS_UPDATE") {
            const { block_id, status, error } = parsedData.payload as any;
            setBlockResult(block_id, {
              status,
              payload: error ? { error } : null,
            });
          }
          // --- START OF DEFINITIVE FIX ---
          // Handle generic errors that are related to a block execution
          else if (
            parsedData.type === "RESULT_ERROR" &&
            parsedData.command_id.startsWith("run-block-")
          ) {
            // Find which block is currently in the 'running' state in our store.
            // This is a reliable way to associate the error with the correct block.
            const runningBlockId = Object.entries(
              useSessionStore.getState().blockResults
            ).find(([_id, res]) => res.status === "running")?.[0];

            if (runningBlockId) {
              // Update that specific block's state to 'error' and store the error message.
              setBlockResult(runningBlockId, {
                status: "error",
                payload: parsedData.payload as ErrorPayload,
              });
            }
            // Also update the lastJsonMessage for any other generic listeners.
            setLastJsonMessage(parsedData);
            // --- END OF DEFINITIVE FIX ---
          } else {
            // Fallback for all other message types (e.g., sidebar lists, session updates)
            setLastJsonMessage(parsedData);
          }
        } catch (e) {
          logger("🔥 Error parsing WS message:", e);
        }
      },
      shouldReconnect: () => true,
      reconnectInterval: 3000,
    });

  const sendMessage = useCallback(
    (message: OutboundMessage) => {
      logger("📤 SENDING MESSAGE TO SERVER:", message);
      if (readyState === ReadyState.OPEN) {
        sendBaseMessage(message);
      } else {
        notifications.show({
          title: "Connection Error",
          message: "Cannot send message: Not connected to the cx-server.",
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
