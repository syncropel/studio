"use client";

import { ActionIcon, Box, Button, Group, Tooltip } from "@mantine/core";
import {
  IconSearch,
  IconPlayerPlay,
  IconTerminal2,
  IconAdjustments,
} from "@tabler/icons-react";
import { useSessionStore } from "@/shared/store/useSessionStore";

export default function BottomActionBar() {
  const {
    currentPage,
    openSpotlight,
    toggleTerminal, // This will toggle the Activity Hub bottom sheet
    toggleInspectorDrawer,
  } = useSessionStore();

  const handleRunAll = () => {
    // This is a placeholder for now. We will wire it up with the WebSocket later.
    console.log("TODO: Implement Run All from BottomActionBar");
  };

  return (
    <Box
      component="footer"
      className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
    >
      <Group justify="space-around" p="xs">
        {currentPage ? (
          // --- Contextual Actions for the Notebook View ---
          <>
            <Tooltip label="Search (Ctrl+K)">
              <ActionIcon
                onClick={openSpotlight}
                size="xl"
                variant="subtle"
                color="gray"
              >
                <IconSearch size={22} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Run All Blocks">
              <ActionIcon
                onClick={handleRunAll}
                size="xl"
                variant="subtle"
                color="gray"
              >
                <IconPlayerPlay size={22} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Activity Hub">
              <ActionIcon
                onClick={() => toggleTerminal()}
                size="xl"
                variant="subtle"
                color="gray"
              >
                <IconTerminal2 size={22} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Inspector">
              <ActionIcon
                onClick={() => toggleInspectorDrawer()}
                size="xl"
                variant="subtle"
                color="gray"
              >
                <IconAdjustments size={22} />
              </ActionIcon>
            </Tooltip>
          </>
        ) : (
          // --- Single Action for the Homepage View ---
          <Tooltip label="Open Spotlight (Ctrl+K)">
            <Button
              onClick={openSpotlight}
              fullWidth
              variant="default"
              leftSection={<IconSearch size={18} />}
            >
              Search or jump to...
            </Button>
          </Tooltip>
        )}
      </Group>
    </Box>
  );
}
