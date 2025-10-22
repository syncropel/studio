// /home/dpwanjala/repositories/syncropel/studio/src/widgets/TopBar/index.tsx
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
} from "@tabler/icons-react";
import SaveAsModal from "../SaveAsModal";

export default function TopBar() {
  const {
    currentPage,
    setCurrentPage,
    clearAllBlockResults,
    updatePageMetadata,
    isDirty,
    pageRunStatus,
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
  } = useUIStateStore();

  const { readyState } = useWebSocket();
  const isConnected = readyState === ReadyState.OPEN;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(currentPage?.name || "");

  const isMobile = useMediaQuery("(max-width: 768px)");
  const router = useRouter();

  useEffect(() => {
    if (currentPage) {
      setTitleValue(currentPage.name);
    } else {
      setTitleValue("");
    }
    setIsEditingTitle(false);
  }, [currentPage]);

  const handleTitleSave = () => {
    if (titleValue.trim() && titleValue !== currentPage?.name) {
      updatePageMetadata({ name: titleValue });
    }
    setIsEditingTitle(false);
  };

  const handleSave = () => triggerSave();
  const handleRunAll = () => triggerRunAll();

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

  const DesktopMenus = () => (
    <Group gap="xs">
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button variant="subtle" size="xs">
            File
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            onClick={() => triggerCommandPalette()}
            rightSection={<Kbd size="xs">Ctrl+Shift+P</Kbd>}
          >
            Command Palette...
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            onClick={handleSave}
            disabled={!currentPage || !isDirty}
            rightSection={<Kbd size="xs">Ctrl+S</Kbd>}
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
          <Button variant="subtle" size="xs">
            View
          </Button>
        </Menu.Target>
        <Menu.Dropdown>{/* View options... */}</Menu.Dropdown>
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
          <Menu.Item disabled>Stop Execution</Menu.Item>
          <Menu.Divider />
          <Menu.Item onClick={clearAllBlockResults} disabled={!currentPage}>
            Clear All Outputs
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button variant="subtle" size="xs">
            Panels
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
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
            Inspector
          </Menu.Item>
          <Menu.Item
            onClick={() => toggleTerminal()}
            rightSection={isTerminalVisible ? "✓" : ""}
          >
            Activity Hub
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );

  // --- DEFINITIVE FIX: Conditional layout based on connection state ---
  if (!isConnected) {
    return (
      <Box
        component="header"
        px="sm"
        py="xs"
        className="flex items-center justify-center border-b border-gray-200 dark:border-gray-800 flex-shrink-0 h-[50px]"
      >
        <Title order={4} className="text-gray-700 dark:text-gray-300">
          Syncropel Studio
        </Title>
      </Box>
    );
  }

  // Render the full, three-column layout only when connected
  return (
    <Box
      component="header"
      px="sm"
      py="xs"
      className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 flex-shrink-0 gap-4 h-[50px]"
    >
      <Group gap="xs" align="center" style={{ flexShrink: 0 }}>
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

      {!isMobile && (
        <Group justify="center" style={{ flex: 1, minWidth: 250 }}>
          {pageRunStatus?.status === "running" ? (
            <Group
              gap="xs"
              bg="gray.1"
              dark-bg="dark.7"
              p={5}
              px={10}
              style={{ borderRadius: "var(--mantine-radius-sm)" }}
            >
              <Loader size="xs" />
              <Text size="xs" c="dimmed">
                Running:{" "}
                <Text span fw={500} c="blue">
                  {pageRunStatus.current_block_id}
                </Text>
              </Text>
            </Group>
          ) : (
            <UnstyledButton
              onClick={triggerCommandPalette}
              className="w-full max-w-sm px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Group gap="xs" justify="space-between">
                <Group gap="xs">
                  <IconSearch size={16} />
                  <Text>Search or run a command...</Text>
                </Group>
                <Kbd>Ctrl+Shift+P</Kbd>
              </Group>
            </UnstyledButton>
          )}
        </Group>
      )}

      <Group gap="xs" justify="flex-end" style={{ flex: 1, minWidth: 0 }}>
        {currentPage &&
          (isEditingTitle ? (
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
              styles={{ input: { textAlign: "right" } }}
              className="flex-grow max-w-[400px]"
            />
          ) : (
            <Tooltip label="Click to rename" openDelay={500}>
              <UnstyledButton
                onClick={() => setIsEditingTitle(true)}
                className="flex-grow min-w-0"
              >
                <Text size="sm" c="dimmed" truncate ta="right">
                  {currentPage.name}
                  {isDirty ? "*" : ""}
                </Text>
              </UnstyledButton>
            </Tooltip>
          ))}
        {isMobile && currentPage && (
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDotsVertical size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={handleRunAll}>Run All Blocks</Menu.Item>
              <Menu.Item onClick={handleSave}>Save</Menu.Item>
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
