"use client";

import {
  Menu,
  Button,
  Group,
  Box,
  Text,
  UnstyledButton,
  ActionIcon,
  Tooltip,
  Kbd,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import {
  IconMenu2,
  IconSearch,
  IconDotsVertical,
  IconHome,
} from "@tabler/icons-react";

export default function TopBar() {
  const {
    currentPage,
    setCurrentPage,
    isNavigatorVisible,
    toggleNavigator,
    isInspectorVisible,
    toggleInspector,
    isTerminalVisible,
    toggleTerminal,
    openSpotlight,
    toggleNavDrawer,
    pageParameters,
    viewMode,
    setViewMode,
    showCodeBlocks,
    toggleShowCodeBlocks,
    showMarkdownBlocks,
    toggleShowMarkdownBlocks,
    setShowOutputsOnly,
  } = useSessionStore();

  const { sendJsonMessage } = useWebSocket();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const router = useRouter();

  const handleSave = () => {
    if (!currentPage) return; /* ... */
  };
  const handleRunAll = () => {
    if (!currentPage?.id) return; /* ... */
  };
  const goToHome = () => {
    setCurrentPage(null);
    router.push("/");
  };
  const isOutputsOnly = !showCodeBlocks && !showMarkdownBlocks;

  const DesktopMenus = () => (
    <Group gap="xs">
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button variant="subtle" size="xs">
            File
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item disabled>New Page...</Menu.Item>
          <Menu.Item
            onClick={handleSave}
            disabled={!currentPage}
            rightSection={<Kbd size="xs">Ctrl+S</Kbd>}
          >
            Save
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item disabled>Exit</Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button variant="subtle" size="xs">
            Panels
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {/* --- DEFINITIVE FIX APPLIED TO ALL TOGGLES --- */}
          <Menu.Item
            onClick={() => toggleNavigator()}
            rightSection={isNavigatorVisible ? "✓" : ""}
          >
            Navigator Sidebar
          </Menu.Item>
          <Menu.Item
            onClick={() => toggleInspector()}
            rightSection={isInspectorVisible ? "✓" : ""}
          >
            Inspector Panel
          </Menu.Item>
          <Menu.Item
            onClick={() => toggleTerminal()}
            rightSection={isTerminalVisible ? "✓" : ""}
          >
            Activity Hub
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Menu shadow="md" width={240}>
        <Menu.Target>
          <Button variant="subtle" size="xs">
            View
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Perspective</Menu.Label>
          <Menu.Item
            onClick={() => setViewMode("document")}
            rightSection={viewMode === "document" ? "✓" : ""}
          >
            Document View
          </Menu.Item>
          <Menu.Item
            onClick={() => setViewMode("grid")}
            rightSection={viewMode === "grid" ? "✓" : ""}
          >
            Grid View
          </Menu.Item>
          <Menu.Item
            onClick={() => setViewMode("graph")}
            rightSection={viewMode === "graph" ? "✓" : ""}
          >
            Graph View
          </Menu.Item>
          <Menu.Divider />
          <Menu.Label>Content Visibility</Menu.Label>
          <Menu.Item
            onClick={() => toggleShowMarkdownBlocks()}
            rightSection={showMarkdownBlocks ? "✓" : ""}
          >
            Show Markdown
          </Menu.Item>
          <Menu.Item
            onClick={() => toggleShowCodeBlocks()}
            rightSection={showCodeBlocks ? "✓" : ""}
          >
            Show Code Blocks
          </Menu.Item>
          <Menu.Item
            onClick={() => setShowOutputsOnly(!isOutputsOnly)}
            rightSection={isOutputsOnly ? "✓" : ""}
          >
            Show Outputs Only
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button variant="subtle" size="xs">
            Run
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            onClick={handleRunAll}
            disabled={!currentPage}
            rightSection={<Kbd size="xs">Ctrl+F5</Kbd>}
          >
            Run All Blocks
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item disabled>Stop Execution</Menu.Item>
          <Menu.Item disabled>Clear All Outputs</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );

  const MobileMenu = () => (
    <Menu shadow="md" width={240}>
      <Menu.Target>
        <Tooltip label="Open menu">
          <ActionIcon variant="subtle" color="gray">
            <IconMenu2 size={18} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>File</Menu.Label>
        <Menu.Item onClick={handleSave} disabled={!currentPage}>
          Save
        </Menu.Item>
        <Menu.Divider />
        <Menu.Label>Panels</Menu.Label>
        {/* These toggles are for the mobile drawers and are also correctly wrapped */}
        <Menu.Item onClick={() => toggleNavDrawer()}>
          Toggle Navigator
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );

  return (
    <Box
      component="header"
      px="sm"
      py="xs"
      className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 flex-shrink-0 gap-4"
    >
      <Group gap="xs" align="center">
        {isMobile ? (
          <>
            <Tooltip label="Toggle Workspace Navigator">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => toggleNavDrawer()}
                size="lg"
              >
                <IconMenu2 size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Go to Homepage">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={goToHome}
                size="lg"
              >
                <IconHome size={18} />
              </ActionIcon>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip label="Go to Homepage" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={goToHome}
                size="lg"
              >
                <IconHome size={18} />
              </ActionIcon>
            </Tooltip>
            <DesktopMenus />
          </>
        )}
      </Group>

      {!isMobile && currentPage && (
        <Group justify="center" style={{ flex: 1 }}>
          <UnstyledButton
            onClick={openSpotlight}
            className="w-full max-w-sm px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Group gap="xs" justify="space-between">
              <Group gap="xs">
                <IconSearch size={16} />
                <Text>Search or navigate to...</Text>
              </Group>
              <Kbd>Ctrl+K</Kbd>
            </Group>
          </UnstyledButton>
        </Group>
      )}

      <Group
        gap="xs"
        justify="flex-end"
        style={isMobile ? { flex: 1, minWidth: 0 } : { minWidth: "200px" }}
      >
        {currentPage && (
          <Text size="xs" c="dimmed" truncate>
            {isMobile ? currentPage.name : currentPage.id || currentPage.name}
          </Text>
        )}
        {isMobile && currentPage && (
          <Group>
            <ActionIcon variant="subtle" color="gray" onClick={openSpotlight}>
              <IconSearch size={18} />
            </ActionIcon>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray">
                  <IconDotsVertical size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={handleRunAll}>Run All Blocks</Menu.Item>
                <Menu.Item onClick={handleSave}>Save</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        )}
      </Group>
    </Box>
  );
}
