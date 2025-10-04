// /home/dpwanjala/repositories/cx-studio/src/widgets/TopBar/index.tsx
"use client";

import { Menu, Button, Group, Box, Text } from "@mantine/core";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";

export default function TopBar() {
  const {
    currentPage,
    isNavigatorVisible,
    isInspectorVisible,
    isTerminalVisible,
    toggleNavigator,
    toggleInspector,
    toggleTerminal,
    pageParameters,
    showCodeBlocks,
    showMarkdownBlocks,
    toggleShowCodeBlocks,
    toggleShowMarkdownBlocks,
    setShowOutputsOnly,
    viewMode,
    setViewMode,
  } = useSessionStore();

  const { sendJsonMessage } = useWebSocket();

  const handleSave = () => {
    if (!currentPage) {
      // This should not happen if the button is disabled, but it's a safe guard.
      console.warn("Save action triggered but no current page is loaded.");
      return;
    }
    sendJsonMessage({
      type: "SAVE_PAGE",
      command_id: `save-page-${nanoid()}`,
      payload: { page: currentPage },
    });
  };

  const handleRunAll = () => {
    if (!currentPage?.id) return;
    sendJsonMessage({
      type: "RUN_PAGE",
      command_id: `run-page-${nanoid()}`,
      payload: {
        page_id: currentPage.id,
        parameters: pageParameters,
      },
    });
  };
  const isOutputsOnly = !showCodeBlocks && !showMarkdownBlocks;

  return (
    <Box
      component="header"
      p="xs"
      className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 flex-shrink-0"
    >
      <Group>
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <Button variant="subtle" size="xs">
              File
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item disabled>New Page (Ctrl+N)</Menu.Item>
            <Menu.Item disabled>Open Page... (Ctrl+O)</Menu.Item>
            <Menu.Divider />
            <Menu.Item
              onClick={handleSave}
              disabled={!currentPage}
              rightSection={
                <Text size="xs" c="dimmed">
                  Ctrl+S
                </Text>
              }
            >
              Save
            </Menu.Item>
            <Menu.Item disabled>Save As... (Ctrl+Shift+S)</Menu.Item>
            <Menu.Divider />
            <Menu.Item disabled>Publish...</Menu.Item>
            <Menu.Divider />
            <Menu.Item disabled>Close Page (Ctrl+W)</Menu.Item>
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
            <Menu.Item
              onClick={toggleNavigator}
              rightSection={isNavigatorVisible ? "✓" : ""}
            >
              Navigator Sidebar
            </Menu.Item>
            <Menu.Item
              onClick={toggleInspector}
              rightSection={isInspectorVisible ? "✓" : ""}
            >
              Inspector Panel
            </Menu.Item>
            <Menu.Item
              onClick={toggleTerminal}
              rightSection={isTerminalVisible ? "✓" : ""}
            >
              Terminal / Log Panel
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
              onClick={toggleShowMarkdownBlocks}
              rightSection={showMarkdownBlocks ? "✓" : ""}
            >
              Show Markdown
            </Menu.Item>
            <Menu.Item
              onClick={toggleShowCodeBlocks}
              rightSection={showCodeBlocks ? "✓" : ""}
            >
              Show Code Blocks
            </Menu.Item>
            <Menu.Divider />
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
              rightSection={
                <Text size="xs" c="dimmed">
                  Ctrl+F5
                </Text>
              }
            >
              Run All Blocks
            </Menu.Item>
            <Menu.Item disabled>Run All Above</Menu.Item>
            <Menu.Item disabled>Run All Below</Menu.Item>
            <Menu.Divider />
            <Menu.Item disabled>Stop Execution</Menu.Item>
            <Menu.Item disabled>Clear All Outputs</Menu.Item>
          </Menu.Dropdown>
        </Menu>

        {/* Placeholder for future menus */}
        {/* <Button variant="subtle" size="xs" disabled>
          Edit
        </Button>
        <Button variant="subtle" size="xs" disabled>
          Run
        </Button>
        <Button variant="subtle" size="xs" disabled>
          Help
        </Button> */}
      </Group>

      {/* Center/Right Section for document status */}
      <Box>
        {currentPage && (
          <Text size="xs" c="dimmed">
            {currentPage.id || currentPage.name}
          </Text>
        )}
      </Box>
    </Box>
  );
}
