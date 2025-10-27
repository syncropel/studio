// /home/dpwanjala/repositories/syncropel/studio/src/widgets/OutputPanel/ContextPopover.tsx
"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Box,
  Text,
  Loader,
  Center,
  Button,
  Group,
  ScrollArea,
  Divider,
  Stack,
  CloseButton,
  TextInput,
  Checkbox,
  ActionIcon,
  Badge,
  Alert,
} from "@mantine/core";
import Tree, { type TreeNodeProps } from "rc-tree";
import type { EventDataNode, Key } from "rc-tree/lib/interface";
import {
  IconFileCode,
  IconFolder,
  IconChevronDown,
  IconChevronRight,
  IconFolderOpen,
  IconFileText,
  IconBuildingStore,
  IconDeviceFloppy,
  IconX,
  IconSearch,
  IconFile,
} from "@tabler/icons-react";
import { useSessionStore, AssetTreeNode } from "@/shared/store/useSessionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";
import CollapsibleSection from "@/widgets/SidebarWidget/CollapsibleSection";

interface ContextPopoverProps {
  initialCheckedKeys?: string[];
  onAttach: (paths: string[]) => void;
  onClose: () => void;
}

/**
 * ContextPopover - A compact context selection popover with search and preset loading
 * Allows users to select workspace files/folders and save/load context presets
 */
export default function ContextPopover({
  initialCheckedKeys = [],
  onAttach,
  onClose,
}: ContextPopoverProps) {
  // --- STATE MANAGEMENT ---
  const {
    projectsTreeData,
    cxHomeTreeData,
    isWorkspaceLoading,
    lastJsonMessage,
  } = useSessionStore();
  const { sendJsonMessage } = useWebSocket();

  const [checkedKeys, setCheckedKeys] = useState<Key[]>(initialCheckedKeys);
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([
    "projects://",
    "cx_home://",
  ]);
  const [loadingContextFile, setLoadingContextFile] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyPresets, setShowOnlyPresets] = useState(false);
  const [loadedPresetName, setLoadedPresetName] = useState<string | null>(null);

  // --- HELPER FUNCTIONS ---

  // Recursively filter tree based on search query
  const filterTreeNodes = useCallback(
    (nodes: AssetTreeNode[], query: string): AssetTreeNode[] => {
      if (!query) return nodes;

      const lowerQuery = query.toLowerCase();

      return nodes.reduce((filtered, node) => {
        const matchesTitle = node.title.toLowerCase().includes(lowerQuery);
        const matchesKey = node.key.toLowerCase().includes(lowerQuery);

        if (node.children) {
          const filteredChildren = filterTreeNodes(node.children, query);
          if (filteredChildren.length > 0 || matchesTitle || matchesKey) {
            filtered.push({
              ...node,
              children:
                filteredChildren.length > 0 ? filteredChildren : node.children,
            });
          }
        } else if (matchesTitle || matchesKey) {
          filtered.push(node);
        }

        return filtered;
      }, [] as AssetTreeNode[]);
    },
    []
  );

  // Find all .context.md files
  const contextFiles = useMemo(() => {
    const files: Array<{ key: string; title: string; path: string }> = [];

    function findContextFiles(nodes: AssetTreeNode[], pathPrefix = "") {
      for (const node of nodes) {
        const currentPath = pathPrefix
          ? `${pathPrefix}/${node.title}`
          : node.title;

        if (node.isLeaf && node.title.endsWith(".context.md")) {
          files.push({
            key: node.key,
            title: node.title,
            path: currentPath,
          });
        }
        if (node.children) {
          findContextFiles(node.children, currentPath);
        }
      }
    }

    findContextFiles(projectsTreeData);
    findContextFiles(cxHomeTreeData);

    return files;
  }, [projectsTreeData, cxHomeTreeData]);

  // Filter context files based on search
  const filteredContextFiles = useMemo(() => {
    if (!searchQuery) return contextFiles;
    const lowerQuery = searchQuery.toLowerCase();
    return contextFiles.filter(
      (file) =>
        file.title.toLowerCase().includes(lowerQuery) ||
        file.path.toLowerCase().includes(lowerQuery)
    );
  }, [contextFiles, searchQuery]);

  // Filter tree data based on search
  const filteredProjectsTree = useMemo(
    () => filterTreeNodes(projectsTreeData, searchQuery),
    [projectsTreeData, searchQuery, filterTreeNodes]
  );

  const filteredCxHomeTree = useMemo(
    () => filterTreeNodes(cxHomeTreeData, searchQuery),
    [cxHomeTreeData, searchQuery, filterTreeNodes]
  );

  // Calculate match count for search
  const matchCount = useMemo(() => {
    if (!searchQuery) return 0;
    let count = 0;
    const countNodes = (nodes: AssetTreeNode[]) => {
      nodes.forEach((node) => {
        count++;
        if (node.children) countNodes(node.children);
      });
    };
    countNodes(filteredProjectsTree);
    countNodes(filteredCxHomeTree);
    return count;
  }, [searchQuery, filteredProjectsTree, filteredCxHomeTree]);

  // --- DATA LOADING & HANDLERS ---

  // Listen for .context.md file content response
  useEffect(() => {
    if (
      lastJsonMessage?.type === "VFS.CONTENT_RESULT" &&
      lastJsonMessage.command_id === loadingContextFile
    ) {
      const content = lastJsonMessage.payload.fields?.content;
      if (typeof content === "string") {
        // Parse the text file - list of VFS paths separated by newlines
        const paths = content
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        setCheckedKeys(paths);
      }
      setLoadingContextFile(null);
    }
  }, [lastJsonMessage, loadingContextFile]);

  // Automatically expand filtered nodes when searching
  useEffect(() => {
    if (searchQuery && !showOnlyPresets) {
      const keysToExpand = new Set<Key>(expandedKeys);

      const addExpandedKeys = (nodes: AssetTreeNode[]) => {
        nodes.forEach((node) => {
          if (node.children && node.children.length > 0) {
            keysToExpand.add(node.key);
            addExpandedKeys(node.children);
          }
        });
      };

      addExpandedKeys(filteredProjectsTree);
      addExpandedKeys(filteredCxHomeTree);

      setExpandedKeys(Array.from(keysToExpand));
    }
  }, [searchQuery, showOnlyPresets, filteredProjectsTree, filteredCxHomeTree]);

  const onLoadData = useCallback(
    (treeNode: EventDataNode<AssetTreeNode>): Promise<void> => {
      return new Promise((resolve) => {
        if (treeNode.children && treeNode.children.length > 0) {
          resolve();
          return;
        }
        sendJsonMessage({
          type: "WORKSPACE.BROWSE",
          command_id: `browse-context-${treeNode.key}-${nanoid()}`,
          payload: { path: treeNode.key as string },
        });
        resolve();
      });
    },
    [sendJsonMessage]
  );

  const handleCheck = (
    keys: Key[] | { checked: Key[]; halfChecked: Key[] }
  ) => {
    const newCheckedKeys = Array.isArray(keys) ? keys : keys.checked;
    setCheckedKeys(newCheckedKeys);
  };

  const handleAttachClick = () => {
    onAttach(checkedKeys as string[]);
    onClose();
  };

  // Load a .context.md preset file by clicking on it
  const handleLoadPreset = (filePath: string, fileName: string) => {
    const commandId = `vfs-read-context-${nanoid()}`;
    setLoadingContextFile(commandId);
    setLoadedPresetName(fileName);

    sendJsonMessage({
      type: "VFS.READ_CONTENT",
      command_id: commandId,
      payload: { uri: filePath },
    });

    // Auto-return to normal tree view after loading
    setShowOnlyPresets(false);
    setSearchQuery("");
  };

  const handleSaveContextFile = () => {
    // TODO: Open modal to save context file
    console.log("Saving context file with items:", checkedKeys);
  };

  const handleClearSelection = () => {
    setCheckedKeys([]);
    setLoadedPresetName(null);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const handleDismissBanner = () => {
    setLoadedPresetName(null);
  };

  // --- RENDER HELPERS ---

  const switcherIcon = (props: TreeNodeProps) => {
    if (props.isLeaf) return <span className="rc-tree-switcher-noop" />;
    return props.expanded ? (
      <IconChevronDown
        size={12}
        className="text-neutral-400 dark:text-neutral-500"
      />
    ) : (
      <IconChevronRight
        size={12}
        className="text-neutral-400 dark:text-neutral-500"
      />
    );
  };

  const treeNodeIcon = (props: TreeNodeProps) => {
    const nodeData = props.data as AssetTreeNode;
    const iconSize = 14;

    switch (nodeData.type) {
      case "project":
        return props.expanded ? (
          <IconFolderOpen
            size={iconSize}
            className="text-blue-500 dark:text-blue-400"
          />
        ) : (
          <IconFolder
            size={iconSize}
            className="text-blue-500 dark:text-blue-400"
          />
        );
      case "application":
        return (
          <IconBuildingStore
            size={iconSize}
            className="text-teal-500 dark:text-teal-400"
          />
        );
      case "group":
        return props.expanded ? (
          <IconFolderOpen
            size={iconSize}
            className="text-amber-500 dark:text-amber-400"
          />
        ) : (
          <IconFolder
            size={iconSize}
            className="text-amber-500 dark:text-amber-400"
          />
        );
      case "flow":
        return (
          <IconFileCode
            size={iconSize}
            className="text-purple-500 dark:text-purple-400"
          />
        );
      default:
        return (
          <IconFileText
            size={iconSize}
            className="text-neutral-400 dark:text-neutral-500"
          />
        );
    }
  };

  const renderTree = (data: AssetTreeNode[], placeholder: string) => {
    if (isWorkspaceLoading && data.length === 0) {
      return (
        <Center h={60}>
          <Loader size="xs" />
        </Center>
      );
    }

    if (data.length > 0) {
      return (
        <Tree<AssetTreeNode>
          treeData={data}
          checkable
          onCheck={handleCheck}
          checkedKeys={checkedKeys}
          loadData={onLoadData}
          expandedKeys={expandedKeys}
          onExpand={(keys) => setExpandedKeys(keys as Key[])}
          icon={treeNodeIcon}
          switcherIcon={switcherIcon}
          motion={null}
          showLine={false}
          itemHeight={24}
        />
      );
    }

    return (
      <Box p="sm">
        <Text size="xs" c="dimmed" ta="center">
          {placeholder}
        </Text>
      </Box>
    );
  };

  const renderPresetList = () => {
    if (loadingContextFile) {
      return (
        <Center h={120}>
          <Stack gap="xs" align="center">
            <Loader size="sm" />
            <Text size="xs" c="dimmed">
              Loading preset...
            </Text>
          </Stack>
        </Center>
      );
    }

    if (filteredContextFiles.length === 0) {
      return (
        <Box p="md">
          <Text size="xs" c="dimmed" ta="center">
            {searchQuery
              ? "No matching presets found"
              : "No .context.md files found"}
          </Text>
        </Box>
      );
    }

    return (
      <Stack gap={2}>
        {filteredContextFiles.map((file) => (
          <Box
            key={file.key}
            onClick={() => handleLoadPreset(file.key, file.title)}
            className="px-2 py-1.5 rounded cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Group gap="xs" wrap="nowrap">
              <IconFile size={14} className="text-neutral-400 flex-shrink-0" />
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="xs" className="truncate font-medium">
                  {file.title}
                </Text>
                <Text size="10px" c="dimmed" className="truncate">
                  {file.path}
                </Text>
              </Box>
            </Group>
          </Box>
        ))}
      </Stack>
    );
  };

  return (
    <Stack gap="xs" style={{ width: 380 }}>
      {/* Header with close button */}
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs">
          <Text size="sm" fw={600}>
            Attach Context
          </Text>
          {checkedKeys.length > 0 && (
            <Badge size="xs" variant="light" color="blue" circle>
              {checkedKeys.length}
            </Badge>
          )}
        </Group>
        <CloseButton
          size="xs"
          onClick={onClose}
          icon={<IconX size={14} />}
          aria-label="Close"
        />
      </Group>

      {/* Search input with preset toggle */}
      <Stack gap={6}>
        <TextInput
          size="xs"
          placeholder={
            showOnlyPresets
              ? "Search presets..."
              : "Search files and folders..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={14} />}
          rightSection={
            searchQuery && (
              <ActionIcon
                size="xs"
                variant="subtle"
                onClick={handleClearSearch}
                aria-label="Clear search"
              >
                <IconX size={12} />
              </ActionIcon>
            )
          }
          styles={{
            input: { fontSize: "12px", height: "28px" },
          }}
        />

        <Checkbox
          size="xs"
          label="Only .context.md presets"
          checked={showOnlyPresets}
          onChange={(e) => setShowOnlyPresets(e.currentTarget.checked)}
          styles={{
            label: { fontSize: "11px", cursor: "pointer" },
          }}
        />
      </Stack>

      {/* Loaded preset banner */}
      {loadedPresetName && !showOnlyPresets && (
        <Alert
          color="blue"
          variant="light"
          p="xs"
          withCloseButton
          onClose={handleDismissBanner}
          styles={{
            message: { fontSize: "11px" },
            closeButton: { width: "20px", height: "20px" },
          }}
        >
          Loaded: {loadedPresetName}
        </Alert>
      )}

      {/* Search results count */}
      {searchQuery && !showOnlyPresets && matchCount > 0 && (
        <Text size="xs" c="dimmed" px="xs">
          {matchCount} match{matchCount !== 1 ? "es" : ""} found
        </Text>
      )}

      <Divider />

      {/* Tree or preset list */}
      <Box>
        <style jsx global>{`
          .context-tree-compact .rc-tree {
            font-size: 12px;
          }
          .context-tree-compact .rc-tree-treenode {
            display: flex;
            align-items: center;
            padding: 0;
            margin: 0;
            min-height: 24px;
          }
          .context-tree-compact .rc-tree-checkbox {
            margin-right: 6px;
            flex-shrink: 0;
          }
          .context-tree-compact .rc-tree-checkbox-inner {
            width: 14px;
            height: 14px;
            border-radius: 3px;
            border: 1.5px solid #cbd5e1;
            transition: all 0.15s ease;
          }
          .dark .context-tree-compact .rc-tree-checkbox-inner {
            border-color: #475569;
          }
          .context-tree-compact
            .rc-tree-checkbox-checked
            .rc-tree-checkbox-inner {
            background-color: #3b82f6;
            border-color: #3b82f6;
          }
          .context-tree-compact
            .rc-tree-checkbox-checked
            .rc-tree-checkbox-inner:after {
            border-color: white;
            width: 4px;
            height: 8px;
          }
          .context-tree-compact .rc-tree-node-content-wrapper {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 6px;
            margin: 0;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.12s ease;
            color: inherit;
            flex: 1;
            min-width: 0;
          }
          .context-tree-compact .rc-tree-node-content-wrapper:hover {
            background-color: #f1f5f9;
          }
          .dark .context-tree-compact .rc-tree-node-content-wrapper:hover {
            background-color: #1e293b;
          }
          .context-tree-compact .rc-tree-indent-unit {
            width: 16px;
          }
          .context-tree-compact .rc-tree-switcher,
          .context-tree-compact .rc-tree-switcher-noop {
            width: 16px;
            height: 24px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            cursor: pointer;
          }
          .context-tree-compact .rc-tree-switcher:hover {
            opacity: 0.7;
          }
          .context-tree-compact .rc-tree-iconEle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            height: 14px;
            flex-shrink: 0;
          }
          .context-tree-compact .rc-tree-title {
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            user-select: none;
            color: #0f172a;
          }
          .dark .context-tree-compact .rc-tree-title {
            color: #e2e8f0;
          }
        `}</style>

        <ScrollArea
          h={240}
          type="auto"
          styles={{
            viewport: {
              "& > div": {
                display: "block !important",
              },
            },
          }}
        >
          {showOnlyPresets ? (
            renderPresetList()
          ) : (
            <div className="context-tree-compact">
              <Stack gap="xs">
                <CollapsibleSection
                  title="Projects"
                  icon={IconFolder}
                  isExpanded={true}
                  noPadding
                >
                  {renderTree(filteredProjectsTree, "No projects in workspace")}
                </CollapsibleSection>

                <CollapsibleSection
                  title="Global (~/.cx)"
                  icon={IconFolder}
                  isExpanded={true}
                  noPadding
                >
                  {renderTree(
                    filteredCxHomeTree,
                    "No global configurations found"
                  )}
                </CollapsibleSection>
              </Stack>
            </div>
          )}
        </ScrollArea>
      </Box>

      <Divider />

      {/* Action buttons */}
      <Group justify="space-between">
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          onClick={handleClearSelection}
          disabled={checkedKeys.length === 0}
          leftSection={<IconX size={12} />}
        >
          Clear
        </Button>

        <Group gap={6}>
          <Button
            variant="default"
            size="xs"
            leftSection={<IconDeviceFloppy size={12} />}
            onClick={handleSaveContextFile}
            disabled={checkedKeys.length === 0}
          >
            Save
          </Button>
          <Button
            size="xs"
            onClick={handleAttachClick}
            disabled={checkedKeys.length === 0}
            color="blue"
            variant="filled"
          >
            Attach {checkedKeys.length > 0 && `(${checkedKeys.length})`}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
