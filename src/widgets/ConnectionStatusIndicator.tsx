// /home/dpwanjala/repositories/syncropel/studio/src/widgets/ConnectionStatusIndicator.tsx
"use client";

import React, { useMemo } from "react";
import { Group, Box, Text, Loader } from "@mantine/core";
import { ReadyState } from "react-use-websocket";

// --- START: DEFINITIVE FIX FOR TYPE ERROR ---
// The props interface must match the data being passed to it.
interface ConnectionStatusIndicatorProps {
  readyState: ReadyState;
  isReconnecting: boolean;
  activeProfileName?: string;
}
// --- END: DEFINITIVE FIX ---

/**
 * A small, self-contained component that displays the current WebSocket connection status,
 * including a state for when the connection is being retried.
 */
export default function ConnectionStatusIndicator({
  readyState,
  isReconnecting,
  activeProfileName,
}: ConnectionStatusIndicatorProps) {
  const statusConfig = useMemo(() => {
    // If the provider tells us we are in a reconnect loop, show that first.
    if (isReconnecting) {
      return {
        color: "orange",
        label: "Connection lost. Retrying...",
        processing: true,
      };
    }

    switch (readyState) {
      case ReadyState.OPEN:
        return { color: "green", label: "Connected", processing: false };
      case ReadyState.CONNECTING:
        return {
          color: "yellow",
          label: `Connecting to '${activeProfileName || "server"}'...`,
          processing: true,
        };
      case ReadyState.CLOSED:
      case ReadyState.CLOSING:
      case ReadyState.UNINSTANTIATED:
      default:
        // This is now the terminal failure state after retries have stopped.
        return { color: "red", label: "Connection Failed", processing: false };
    }
  }, [readyState, isReconnecting, activeProfileName]);

  return (
    <Group gap="xs" justify="center" wrap="nowrap">
      {statusConfig.processing ? (
        <Loader color={statusConfig.color} size={10} type="dots" />
      ) : (
        <Box
          w={10}
          h={10}
          bg={statusConfig.color}
          style={{ borderRadius: "50%" }}
        />
      )}
      <Text size="sm" c={statusConfig.color}>
        {statusConfig.label}
      </Text>
    </Group>
  );
}
