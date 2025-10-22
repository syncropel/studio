// /home/dpwanjala/repositories/syncropel/studio/src/widgets/BottomActionBar/index.tsx
"use client";

import { ActionIcon, Box, Button, Group, Tooltip } from "@mantine/core";
import {
  IconSearch,
  IconPlayerPlay,
  IconTerminal2,
  IconAdjustments,
} from "@tabler/icons-react";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useUIStateStore } from "@/shared/store/useUIStateStore";
import ActivityHubWidget from "../ActivityHubWidget";

export default function BottomActionBar() {
  const { currentPage } = useSessionStore();
  const { openSpotlight, toggleInspectorDrawer, openModal, triggerRunAll } =
    useUIStateStore();

  const handleRunAll = () => {
    triggerRunAll();
  };

  const handleOpenActivityHub = () => {
    openModal({
      title: "Activity Hub",
      content: <ActivityHubWidget />,
      size: "95%",
    });
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
                onClick={handleOpenActivityHub}
                size="xl"
                variant="subtle"
                color="gray"
              >
                <IconTerminal2 size={22} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Inspector">
              <ActionIcon
                onClick={() => toggleInspectorDrawer(true)}
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
