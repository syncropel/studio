// /home/dpwanjala/repositories/syncropel/studio/src/widgets/TopBar/index.tsx
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
  const { currentPage, setCurrentPage, clearAllBlockResults } =
    useSessionStore();
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
  // Get the new action from the UI store
  const { openSpotlight, toggleNavDrawer, setFoldingCommand } =
    useUIStateStore();

  const isMobile = useMediaQuery("(max-width: 768px)");
  const router = useRouter();

  const handleSave = () => {
    /* ... placeholder ... */
  };
  const handleRunAll = () => {
    /* ... placeholder ... */
  };
  const goToHome = () => {
    setCurrentPage(null);
    router.push("/");
  };

  const DesktopMenus = () => (
    <Group gap="xs">
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button variant="subtle" size="xs">
            File
          </Button>
        </Menu.Target>
        {/* ... File menu content ... */}
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

          {/* --- DEFINITIVE FIX: WIRE UP FOLDING ACTIONS --- */}
          <Menu.Label>Folding Actions</Menu.Label>
          <Menu.Item onClick={() => setFoldingCommand("collapseAll")}>
            Collapse All Blocks
          </Menu.Item>
          <Menu.Item onClick={() => setFoldingCommand("expandAll")}>
            Expand All Blocks
          </Menu.Item>
          {/* TODO: Implement a more granular `collapseCode` that leaves metadata open */}
          <Menu.Item onClick={() => setFoldingCommand("collapseAll")}>
            Collapse All Code
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button variant="subtle" size="xs">
            Run
          </Button>
        </Menu.Target>
        {/* ... Run menu content ... */}
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
        {/* ... Panels menu content ... */}
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

  // The rest of the component (main return statement) is unchanged.
  // ... copy the rest of the component from the previous correct version ...
  return (
    <Box
      component="header"
      px="sm"
      py="xs"
      className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 flex-shrink-0 gap-4"
    >
      {/* Left Section: Navigation and Menus */}
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

      {/* Center Section: Universal Search */}
      {!isMobile && (
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

      {/* Right Section: Page Context and Mobile Actions */}
      <Group
        gap="xs"
        justify="flex-end"
        style={isMobile ? { flex: 1, minWidth: 0 } : { minWidth: "200px" }}
      >
        {currentPage && (
          <Text size="xs" c="dimmed" truncate>
            {currentPage.name}
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
                <Menu.Divider />
                <Menu.Item onClick={clearAllBlockResults} color="red">
                  Clear All Outputs
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        )}
      </Group>
    </Box>
  );
}
