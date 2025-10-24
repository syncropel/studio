"use client";

import React, { useState, useEffect } from "react";
import {
  Menu,
  Button,
  Group,
  Box,
  Text,
  ActionIcon,
  Tooltip,
  Kbd,
  TextInput,
  UnstyledButton,
  Loader,
  Title,
} from "@mantine/core";
import { useHotkeys, useMediaQuery } from "@mantine/hooks";
import { ReadyState } from "react-use-websocket";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useSettingsStore } from "@/shared/store/useSettingsStore";
import { useUIStateStore } from "@/shared/store/useUIStateStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { useRouter } from "next/navigation";
import {
  IconMenu2,
  IconSearch,
  IconDotsVertical,
  IconHome,
  IconCheck,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import SaveAsModal from "../SaveAsModal";

export default function TopBar() {
  // --- STATE MANAGEMENT ---
  // All state from Zustand stores - single source of truth
  const {
    currentPage,
    setCurrentPage,
    clearAllBlockResults,
    updatePageMetadata,
    isDirty,
    pageRunStatus,
    lastJsonMessage,
  } = useSessionStore();

  const {
    isNavigatorVisible,
    toggleNavigator,
    isInspectorVisible,
    toggleInspector,
    isTerminalVisible,
    toggleTerminal,
    viewMode,
    setViewMode,
  } = useSettingsStore();

  const {
    setFoldingCommand,
    toggleNavDrawer,
    triggerCommandPalette,
    triggerSave,
    triggerRunAll,
    openModal,
    isSaving,
  } = useUIStateStore();

  const { readyState } = useWebSocket();
  const isConnected = readyState === ReadyState.OPEN;

  // Local UI state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(currentPage?.name || "");
  const [showSaved, setShowSaved] = useState(false);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const router = useRouter();

  // --- EFFECTS ---
  // Sync local title with global state when page changes
  useEffect(() => {
    if (currentPage) {
      setTitleValue(currentPage.name);
    } else {
      setTitleValue("");
    }
    setIsEditingTitle(false);
  }, [currentPage]);

  // Handle "Saved" confirmation display after successful save
  useEffect(() => {
    if (lastJsonMessage?.type === "PAGE.SAVED") {
      setShowSaved(true);
      const timer = setTimeout(() => {
        setShowSaved(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [lastJsonMessage]);

  // --- HANDLERS ---
  const handleTitleSave = () => {
    if (titleValue.trim() && titleValue !== currentPage?.name) {
      updatePageMetadata({ name: titleValue });
    }
    setIsEditingTitle(false);
  };

  const handleSave = () => triggerSave();
  const handleRunAll = () => triggerRunAll();

  // Keyboard shortcuts
  useHotkeys([
    [
      "mod+S",
      (e) => {
        e.preventDefault();
        if (isDirty) handleSave();
      },
    ],
    [
      "mod+F5",
      (e) => {
        e.preventDefault();
        if (currentPage) handleRunAll();
      },
    ],
  ]);

  const goToHome = () => {
    setCurrentPage(null);
    router.push("/");
  };

  const handleSaveAs = () => {
    openModal({
      title: "Save Notebook As...",
      content: <SaveAsModal />,
      size: "lg",
    });
  };

  // --- SUB-COMPONENTS ---
  // Desktop menu bar with File/View/Run menus
  const DesktopMenus = () => (
    <Group gap={4}>
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button variant="subtle" size="xs" c="dimmed">
            File
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            onClick={handleSave}
            disabled={!currentPage || !isDirty}
            rightSection={<Kbd size="xs">⌘S</Kbd>}
            leftSection={<IconDeviceFloppy size={16} />}
          >
            Save
          </Menu.Item>
          <Menu.Item onClick={handleSaveAs} disabled={!currentPage}>
            Save As...
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item disabled>Exit</Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <Menu shadow="md" width={240}>
        <Menu.Target>
          <Button variant="subtle" size="xs" c="dimmed">
            View
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Page Perspective</Menu.Label>
          <Menu.Item
            onClick={() => setViewMode("document")}
            rightSection={viewMode === "document" ? "✓" : ""}
            disabled={!currentPage}
          >
            Document View
          </Menu.Item>
          <Menu.Item
            onClick={() => setViewMode("grid")}
            rightSection={viewMode === "grid" ? "✓" : ""}
            disabled={!currentPage}
          >
            Grid View
          </Menu.Item>
          <Menu.Item
            onClick={() => setViewMode("graph")}
            rightSection={viewMode === "graph" ? "✓" : ""}
            disabled={!currentPage}
          >
            Graph View
          </Menu.Item>
          <Menu.Divider />
          <Menu.Label>Document Content</Menu.Label>
          <Menu.Item
            onClick={() => setFoldingCommand("collapseAll")}
            disabled={viewMode !== "document" || !currentPage}
          >
            Collapse All Blocks
          </Menu.Item>
          <Menu.Item
            onClick={() => setFoldingCommand("expandAll")}
            disabled={viewMode !== "document" || !currentPage}
          >
            Expand All Blocks
          </Menu.Item>
          <Menu.Divider />
          <Menu.Label>UI Panels</Menu.Label>
          <Menu.Item
            onClick={() => toggleNavigator()}
            rightSection={isNavigatorVisible ? "✓" : ""}
          >
            Navigator
          </Menu.Item>
          <Menu.Item
            onClick={() => toggleInspector()}
            rightSection={isInspectorVisible ? "✓" : ""}
          >
            Inspector / Data Tray
          </Menu.Item>
          <Menu.Item
            onClick={() => toggleTerminal()}
            rightSection={isTerminalVisible ? "✓" : ""}
          >
            Activity Hub
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button variant="subtle" size="xs" c="dimmed">
            Run
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            onClick={handleRunAll}
            disabled={!currentPage}
            rightSection={<Kbd size="xs">⌘F5</Kbd>}
          >
            Run All Blocks
          </Menu.Item>
          <Menu.Item disabled>Stop Execution</Menu.Item>
          <Menu.Divider />
          <Menu.Item onClick={clearAllBlockResults} disabled={!currentPage}>
            Clear All Outputs
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );

  // CHANGED: Clean status indicator component - separate from title
  const SaveStatus = () => {
    if (showSaved) {
      return (
        <Group gap={4} className="text-green-600 dark:text-green-400">
          <IconCheck size={14} stroke={2.5} />
          <Text size="xs" fw={500}>
            Saved
          </Text>
        </Group>
      );
    }
    if (isSaving) {
      return (
        <Group gap={4} className="text-blue-600 dark:text-blue-400">
          <Loader size={12} />
          <Text size="xs" fw={500}>
            Saving...
          </Text>
        </Group>
      );
    }
    if (isDirty) {
      return (
        <Tooltip label="Unsaved changes" withArrow openDelay={300}>
          <Box className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
        </Tooltip>
      );
    }
    return null;
  };

  // --- RENDER LOGIC ---
  // Disconnected state - minimal header
  if (!isConnected) {
    return (
      <Box
        component="header"
        px="md"
        py="xs"
        className="flex items-center justify-center border-b border-gray-200 dark:border-gray-800 h-12 bg-white dark:bg-gray-950"
      >
        <Title order={5} c="dimmed" fw={500}>
          Syncropel Studio
        </Title>
      </Box>
    );
  }

  // CHANGED: Full header with improved three-column layout
  return (
    <Box
      component="header"
      px="md"
      py={0}
      className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 h-12 bg-white dark:bg-gray-950"
    >
      {/* LEFT SECTION - Navigation (flex-shrink-0 to prevent compression) */}
      <Group gap="xs" className="flex-shrink-0">
        {isMobile ? (
          <>
            <Tooltip label="Toggle Navigator">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => toggleNavDrawer()}
                size="md"
              >
                <IconMenu2 size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Home">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={goToHome}
                size="md"
              >
                <IconHome size={18} />
              </ActionIcon>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip label="Home" withArrow openDelay={500}>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={goToHome}
                size="md"
              >
                <IconHome size={18} />
              </ActionIcon>
            </Tooltip>
            <DesktopMenus />
          </>
        )}
      </Group>

      {/* CENTER SECTION - Search/Status (flex-1 to take available space) */}
      {!isMobile && (
        <Box className="flex-1 flex justify-center px-4 min-w-0">
          {pageRunStatus?.status === "running" ? (
            <Group
              gap="xs"
              className="px-3 py-1 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800"
            >
              <Loader size={14} color="blue" />
              <Text size="xs" c="dimmed">
                Running:{" "}
                <Text span fw={500} c="blue.6">
                  {pageRunStatus.current_block_id}
                </Text>
              </Text>
            </Group>
          ) : (
            <UnstyledButton
              onClick={triggerCommandPalette}
              className="w-full max-w-md px-3 py-1.5 flex items-center justify-between border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <Group gap="xs" className="text-gray-500 dark:text-gray-400">
                <IconSearch size={14} />
                <Text size="xs">Search or run a command...</Text>
              </Group>
              <Kbd size="xs">⌘⇧P</Kbd>
            </UnstyledButton>
          )}
        </Box>
      )}

      {/* RIGHT SECTION - Page Title & Status (flex-shrink-0 to prevent compression) */}
      <Group gap="xs" className="flex-shrink-0 min-w-0" justify="flex-end">
        {currentPage && (
          <Group gap={8} className="min-w-0">
            {/* CHANGED: Save status indicator - positioned cleanly before title */}
            <Box className="flex items-center justify-center w-4">
              <SaveStatus />
            </Box>

            {/* CHANGED: Page title with improved layout - no overlapping indicator */}
            {isEditingTitle ? (
              <TextInput
                value={titleValue}
                onChange={(e) => setTitleValue(e.currentTarget.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") {
                    setTitleValue(currentPage.name);
                    setIsEditingTitle(false);
                  }
                }}
                size="xs"
                autoFocus
                className="w-48"
                styles={{
                  input: {
                    textAlign: "right",
                    fontWeight: 500,
                    fontSize: "0.8125rem",
                  },
                }}
              />
            ) : (
              <Tooltip label="Click to rename" openDelay={500} withArrow>
                <UnstyledButton
                  onClick={() => setIsEditingTitle(true)}
                  className="min-w-0 max-w-xs"
                >
                  <Text
                    size="sm"
                    c={
                      showSaved
                        ? "green.6"
                        : isDirty || isSaving
                        ? "blue.6"
                        : "dimmed"
                    }
                    fw={500}
                    truncate
                    className="text-right"
                  >
                    {currentPage.name}
                  </Text>
                </UnstyledButton>
              </Tooltip>
            )}
          </Group>
        )}

        {/* Mobile overflow menu */}
        {isMobile && currentPage && (
          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" size="md">
                <IconDotsVertical size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                onClick={handleRunAll}
                leftSection={<IconSearch size={16} />}
              >
                Run All Blocks
              </Menu.Item>
              <Menu.Item
                onClick={handleSave}
                disabled={!isDirty}
                leftSection={<IconDeviceFloppy size={16} />}
              >
                Save
              </Menu.Item>
              <Menu.Item onClick={handleSaveAs}>Save As...</Menu.Item>
              <Menu.Divider />
              <Menu.Item onClick={clearAllBlockResults} color="red">
                Clear All Outputs
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
    </Box>
  );
}
