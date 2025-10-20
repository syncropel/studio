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
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useSettingsStore } from "@/shared/store/useSettingsStore";
import { useUIStateStore } from "@/shared/store/useUIStateStore";
import { useRouter } from "next/navigation";
import {
  IconMenu2,
  IconSearch,
  IconDotsVertical,
  IconHome,
} from "@tabler/icons-react";

export default function TopBar() {
  // --- STATE MANAGEMENT ---
  // Sourcing state and actions from our three distinct, sliced stores.
  const {
    currentPage,
    setCurrentPage,
    clearAllBlockResults,
    updatePageMetadata,
    isDirty,
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
    showNarrative,
    setShowNarrative,
    showConfig,
    setShowConfig,
    showCode,
    setShowCode,
  } = useSettingsStore();
  const { setFoldingCommand, toggleNavDrawer, triggerCommandPalette } =
    useUIStateStore();

  // Local state for the editable title functionality
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(currentPage?.name || "");

  const isMobile = useMediaQuery("(max-width: 768px)");
  const router = useRouter();

  // Effect to sync the local title input with the global state when the page changes
  useEffect(() => {
    if (currentPage) {
      setTitleValue(currentPage.name);
    } else {
      setTitleValue("");
    }
  }, [currentPage]);

  // --- ACTION HANDLERS ---

  const handleTitleSave = () => {
    if (titleValue.trim() && titleValue !== currentPage?.name) {
      // Dispatch the action to update the page name in the global store
      updatePageMetadata({ name: titleValue });
    }
    setIsEditingTitle(false);
  };

  const handleSave = () => {
    console.log("TODO: Implement Save logic");
  };
  const handleRunAll = () => {
    console.log("TODO: Implement Run All logic");
  };
  const goToHome = () => {
    setCurrentPage(null); // Clear the current page from the session state
    router.push("/");
  };

  // --- DESKTOP MENU COMPONENT ---
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
            disabled={!currentPage || !isDirty}
            rightSection={<Kbd size="xs">Ctrl+S</Kbd>}
          >
            Save
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
          <Menu.Label>Content Filters</Menu.Label>
          <Menu.Item
            onClick={() => setShowNarrative(!showNarrative)}
            rightSection={showNarrative ? "✓" : ""}
          >
            Show Narrative
          </Menu.Item>
          <Menu.Item
            onClick={() => setShowConfig(!showConfig)}
            rightSection={showConfig ? "✓" : ""}
          >
            Show Block Configuration
          </Menu.Item>
          <Menu.Item
            onClick={() => setShowCode(!showCode)}
            rightSection={showCode ? "✓" : ""}
          >
            Show Block Code
          </Menu.Item>
          <Menu.Divider />
          <Menu.Label>Folding Actions</Menu.Label>
          <Menu.Item onClick={() => setFoldingCommand("collapseAll")}>
            Collapse All
          </Menu.Item>
          <Menu.Item onClick={() => setFoldingCommand("expandAll")}>
            Expand All
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
            Inspector (Data Tray)
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

  // --- MAIN RENDER ---
  return (
    <Box
      component="header"
      px="sm"
      py="xs"
      className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 flex-shrink-0 gap-4 h-[50px]"
    >
      {/* Left Section: Navigation and Menus */}
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

      {/* Center Section is now empty, delegating search to Command Palette */}
      {/* Center Section: Command Palette Trigger */}
      {!isMobile && (
        <Group justify="center" style={{ flex: 1 }}>
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
        </Group>
      )}

      {/* Right Section: Editable Title */}
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
                  setTitleValue(currentPage.name); // Revert changes on escape
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
