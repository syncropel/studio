"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useState,
  useEffect,
  useRef, // --- NEW: Import useRef for stability
} from "react";
import useReactWebSocket, { ReadyState } from "react-use-websocket";
import { notifications } from "@mantine/notifications";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { InboundMessage, ErrorPayload } from "@/shared/types/server";

// --- NEW: A helper to get a descriptive string for the ReadyState enum ---
const readyStateToString = (readyState: ReadyState) => {
  return {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];
};

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
  const [socketUrl, setSocketUrl] = useState<string | null>(null);
  const { setLastJsonMessage, setBlockResult } = useSessionStore();

  // This effect runs only once on the client to determine the URL.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const url = `${protocol}//${host}/ws`;
      setSocketUrl(url);
    }
  }, []);

  const { sendJsonMessage: sendBaseMessage, readyState } =
    useReactWebSocket<InboundMessage>(socketUrl, {
      onOpen: () => {
        console.log("[WS] Connection established.");
        notifications.hide("ws-conn-error");
        notifications.show({
          id: "ws-conn-success",
          title: "Connected",
          message: "Successfully connected to the cx-server.",
          color: "green",
          autoClose: 3000,
        });
      },
      onClose: (event) => {
        console.warn(
          `[WS] Connection closed. Clean close: ${event.wasClean}, Code: ${event.code}`
        );
        notifications.show({
          id: "ws-conn-error",
          title: "Connection Lost",
          message: "Attempting to reconnect...",
          color: "red",
          loading: true,
          autoClose: false,
          withCloseButton: false,
        });
      },
      onError: (event) => {
        console.error("[WS] WebSocket error observed:", event);
      },
      onMessage: (event) => {
        // We can keep a minimal log for received messages if needed for debugging
        // console.log("[WS] Received:", event.data);
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
          } else if (
            parsedData.type === "RESULT_ERROR" &&
            parsedData.command_id.startsWith("run-block-")
          ) {
            const runningBlockId = Object.entries(
              useSessionStore.getState().blockResults
            ).find(([_id, res]) => res.status === "running")?.[0];

            if (runningBlockId) {
              setBlockResult(runningBlockId, {
                status: "error",
                payload: parsedData.payload as ErrorPayload,
              });
            }
            setLastJsonMessage(parsedData);
          } else {
            setLastJsonMessage(parsedData);
          }
        } catch (e) {
          console.error("[WS] Error parsing message:", e);
        }
      },
      // --- START: Stability and Reconnection Fixes ---
      shouldReconnect: () => true, // Always attempt to reconnect
      reconnectInterval: 3000, // Reconnect every 3 seconds
      reconnectAttempts: 10, // Attempt up to 10 times before giving up
      retryOnError: true, // Also try to reconnect on WebSocket errors
      // This is the key fix for the "hot-reload-only" issue.
      // It ensures that even if the connection closes unexpectedly (e.g., dev server restarts),
      // the hook will re-establish it.
      share: true,
      // This helps prevent duplicate connections in React 18's Strict Mode
      // by ensuring only one underlying socket is created for this URL.
      // --- END: Stability and Reconnection Fixes ---
      filter: () => socketUrl !== null,
    });

  // Log ready state changes for debugging connection lifecycle
  useEffect(() => {
    console.log(
      `[WS] Connection state changed to: ${readyStateToString(readyState)}`
    );
  }, [readyState]);

  const sendMessage = useCallback(
    (message: OutboundMessage) => {
      // Keep this log for development, it's very useful
      console.log("[WS] Sending:", message);
      if (readyState === ReadyState.OPEN) {
        sendBaseMessage(message);
      } else {
        console.error(
          "[WS] Attempted to send message while connection was not open."
        );
        notifications.show({
          title: "Connection Error",
          message: "Cannot send command: Not connected to the cx-server.",
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
