"use client";

import { Box, Group, Text, UnstyledButton, Indicator } from "@mantine/core";
import { IconChevronRight, IconAlertCircle } from "@tabler/icons-react";
import { useConnectionStore } from "@/shared/store/useConnectionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { ReadyState } from "react-use-websocket";

export default function ConnectionStatus({ onClick }: { onClick: () => void }) {
  const { getActiveProfile } = useConnectionStore();
  const { readyState } = useWebSocket();

  const activeProfile = getActiveProfile();

  // --- START: DEFINITIVE FIX FOR "UNKNOWN" STATE ---
  if (!activeProfile) {
    // This is the new, explicit state for when no profile is active at all.
    return (
      <Box className="border-t border-gray-200 dark:border-gray-800 p-2">
        <UnstyledButton
          onClick={onClick}
          className="w-full p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Group justify="space-between">
            <Group gap="xs">
              <Indicator color="red" size={10} />
              <Box>
                <Text size="sm" fw={500} c="red">
                  Disconnected
                </Text>
                <Text size="xs" c="dimmed">
                  Click to connect to a server
                </Text>
              </Box>
            </Group>
            <IconChevronRight size={16} />
          </Group>
        </UnstyledButton>
      </Box>
    );
  }
  // --- END: DEFINITIVE FIX ---

  // The rest of the component handles the case where a profile IS active.
  const getStatusColor = () => {
    switch (readyState) {
      case ReadyState.OPEN:
        return "green";
      case ReadyState.CONNECTING:
        return "yellow";
      default:
        return "red";
    }
  };

  const getStatusText = () => {
    switch (readyState) {
      case ReadyState.OPEN:
        return "Connected";
      case ReadyState.CONNECTING:
        return "Connecting...";
      default:
        return "Connection Failed";
    }
  };

  return (
    <Box className="border-t border-gray-200 dark:border-gray-800 p-2">
      <UnstyledButton
        onClick={onClick}
        className="w-full p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Group justify="space-between">
          <Group gap="xs">
            <Indicator
              color={getStatusColor()}
              size={10}
              processing={readyState === ReadyState.CONNECTING}
            />
            <Box>
              <Text size="sm" fw={500}>
                {activeProfile.name}
              </Text>
              <Text size="xs" c="dimmed">
                {getStatusText()}
              </Text>
            </Box>
          </Group>
          <IconChevronRight size={16} />
        </Group>
      </UnstyledButton>
    </Box>
  );
}
