// /home/dpwanjala/repositories/syncropel/studio/src/widgets/SidebarWidget/index.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Box, ScrollArea, Text, Loader, Center } from "@mantine/core";
import Tree, { type TreeNodeProps } from "rc-tree";
import type { EventDataNode, Key } from "rc-tree/lib/interface";
import {
  IconFileCode,
  IconFolder,
  IconChevronDown,
  IconChevronRight,
  IconFolderOpen,
  IconFolders,
  IconSettings,
  IconPlug,
  IconVariable,
  IconBuildingStore,
} from "@tabler/icons-react";
import { useSessionStore, AssetTreeNode } from "@/shared/store/useSessionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";
import { ReadyState } from "react-use-websocket";

import CollapsibleSection from "./CollapsibleSection";
import NavigationItem from "./NavigationItem";
import ConnectionStatus from "./ConnectionStatus";

interface SidebarWidgetProps {
  onConnectionClick: () => void;
}

export default function SidebarWidget({
  onConnectionClick,
}: SidebarWidgetProps) {
  const {
    connections,
    variables,
    currentPage,
    projectsTreeData,
    libraryTreeData,
    isWorkspaceLoading,
  } = useSessionStore();

  const { sendJsonMessage, readyState } = useWebSocket();
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const selectedKeys = currentPage?.id ? [currentPage.id] : [];

  // UNCHANGED: Load workspace data when WebSocket is ready
  useEffect(() => {
    if (readyState === ReadyState.OPEN && isWorkspaceLoading) {
      sendJsonMessage({
        type: "WORKSPACE.BROWSE",
        command_id: `browse-root-${nanoid()}`,
        payload: { path: "/" },
      });
    }
  }, [readyState, isWorkspaceLoading, sendJsonMessage]);

  // UNCHANGED: Auto-expand parent nodes when a page is selected
  useEffect(() => {
    if (currentPage?.id) {
      const getParentKeys = (key: Key): Key[] => {
        const pathList: Key[] = [];
        const parts = String(key).split("/").slice(0, -1);
        let currentPath = "";
        for (const part of parts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          pathList.push(currentPath);
        }
        return pathList;
      };
      const parentKeys = getParentKeys(currentPage.id);
      setExpandedKeys((prevKeys) =>
        Array.from(new Set([...prevKeys, ...parentKeys]))
      );
    }
  }, [currentPage]);

  // UNCHANGED: Lazy load tree data
  const onLoadData = useCallback(
    (treeNode: EventDataNode<AssetTreeNode>): Promise<void> => {
      return new Promise((resolve) => {
        if (treeNode.children && treeNode.children.length > 0) {
          resolve();
          return;
        }
        sendJsonMessage({
          type: "WORKSPACE.BROWSE",
          command_id: `browse-${treeNode.key}-${nanoid()}`,
          payload: { path: treeNode.key as string },
        });
        resolve();
      });
    },
    [sendJsonMessage]
  );

  // UNCHANGED: Handle node selection
  const onSelect = useCallback(
    (
      selectedKeys: React.Key[],
      info: { node: EventDataNode<AssetTreeNode> }
    ) => {
      if (info.node.isLeaf) {
        const pageId = info.node.key as string;
        sendJsonMessage({
          type: "PAGE.LOAD",
          command_id: `load-page-${nanoid()}`,
          payload: { page_id: pageId },
        });
      } else {
        setExpandedKeys((keys) => {
          const key = info.node.key;
          return keys.includes(key)
            ? keys.filter((k) => k !== key)
            : [...keys, key];
        });
      }
    },
    [sendJsonMessage]
  );

  // IMPROVED: Switcher icon with better styling
  const switcherIcon = (props: TreeNodeProps) => {
    if (props.isLeaf) return <span className="rc-tree-switcher-noop" />;
    if ((props.data as any)?.isLoadingChildren) return <Loader size={12} />;
    return props.expanded ? (
      <IconChevronDown size={12} className="text-gray-500 dark:text-gray-400" />
    ) : (
      <IconChevronRight
        size={12}
        className="text-gray-500 dark:text-gray-400"
      />
    );
  };

  // IMPROVED: Tree node icons with better colors
  const treeNodeIcon = (props: TreeNodeProps) => {
    const nodeData = props.data as AssetTreeNode;
    switch (nodeData.type) {
      case "project":
        return props.expanded ? (
          <IconFolderOpen size={16} className="text-blue-500" />
        ) : (
          <IconFolder size={16} className="text-blue-500" />
        );
      case "application":
        return <IconBuildingStore size={16} className="text-teal-500" />;
      case "group":
        return props.expanded ? (
          <IconFolderOpen size={16} className="text-amber-500" />
        ) : (
          <IconFolder size={16} className="text-amber-500" />
        );
      case "flow":
        return (
          <IconFileCode
            size={16}
            className="text-gray-400 dark:text-gray-500"
          />
        );
      default:
        return null;
    }
  };

  // UNCHANGED: Render tree with loading state
  const renderTree = (data: AssetTreeNode[], placeholder: string) => {
    if (isWorkspaceLoading && data.length === 0) {
      return (
        <Center>
          <Loader size="xs" m="md" />
        </Center>
      );
    }
    if (data.length > 0) {
      return (
        <Tree<AssetTreeNode>
          treeData={data}
          loadData={onLoadData}
          onSelect={onSelect}
          icon={treeNodeIcon}
          switcherIcon={switcherIcon}
          motion={null}
          showLine={false}
          itemHeight={26}
          expandedKeys={expandedKeys}
          onExpand={(keys) => setExpandedKeys(keys)}
          selectedKeys={selectedKeys}
        />
      );
    }
    return (
      <Text size="xs" c="dimmed" p="xs">
        {placeholder}
      </Text>
    );
  };

  return (
    <aside className="h-full w-full flex flex-col bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800">
      <ScrollArea className="flex-grow p-2">
        <div className="minimalist-tree">
          {/* IMPROVED: Production-grade CSS with proper indentation and hierarchy */}
          <style jsx global>{`
            /* Base tree structure */
            .minimalist-tree .rc-tree {
              margin: 0;
              padding: 0;
            }

            .minimalist-tree .rc-tree-list {
              margin: 0;
              padding: 0;
            }

            /* Tree node structure */
            .minimalist-tree .rc-tree-treenode {
              display: flex;
              align-items: center;
              padding: 0;
              margin: 0;
              min-height: 26px;
            }

            /* CRITICAL: Indent unit controls hierarchy spacing - increased for better visibility */
            .minimalist-tree .rc-tree-indent {
              display: inline-flex;
              align-items: center;
            }

            .minimalist-tree .rc-tree-indent-unit {
              width: 20px;
              flex-shrink: 0;
            }

            /* Switcher (chevron) styling */
            .minimalist-tree .rc-tree-switcher,
            .minimalist-tree .rc-tree-switcher-noop {
              width: 20px;
              height: 26px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              cursor: pointer;
              margin-right: 2px;
            }

            .minimalist-tree .rc-tree-switcher-noop {
              cursor: default;
            }

            /* Icon styling */
            .minimalist-tree .rc-tree-iconEle {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 16px;
              height: 16px;
              flex-shrink: 0;
              margin-right: 6px;
            }

            /* Content wrapper - the clickable area */
            .minimalist-tree .rc-tree-node-content-wrapper {
              display: inline-flex;
              align-items: center;
              flex: 1;
              padding: 3px 6px;
              margin: 1px 0;
              border-radius: 4px;
              cursor: pointer;
              transition: background-color 0.12s ease;
              color: var(--mantine-color-gray-7);
              min-height: 26px;
              line-height: 1.4;
            }

            .dark .minimalist-tree .rc-tree-node-content-wrapper {
              color: var(--mantine-color-gray-3);
            }

            /* Hover state */
            .minimalist-tree .rc-tree-node-content-wrapper:hover {
              background-color: var(--mantine-color-gray-0);
            }

            .dark .minimalist-tree .rc-tree-node-content-wrapper:hover {
              background-color: var(--mantine-color-dark-7);
            }

            /* Selected state */
            .minimalist-tree
              .rc-tree-node-content-wrapper.rc-tree-node-selected {
              background-color: var(--mantine-color-blue-0) !important;
              color: var(--mantine-color-blue-7);
              font-weight: 500;
            }

            .dark
              .minimalist-tree
              .rc-tree-node-content-wrapper.rc-tree-node-selected {
              background-color: var(--mantine-color-dark-6) !important;
              color: var(--mantine-color-blue-4);
            }

            /* Title text */
            .minimalist-tree .rc-tree-title {
              flex: 1;
              font-size: 13px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              user-select: none;
            }

            /* Ensure proper alignment of all elements */
            .minimalist-tree .rc-tree-treenode-switcher-open,
            .minimalist-tree .rc-tree-treenode-switcher-close {
              display: flex;
              align-items: center;
            }

            /* Loading state */
            .minimalist-tree .rc-tree-treenode-loading .rc-tree-switcher {
              opacity: 0.6;
            }

            /* Focus state for accessibility */
            .minimalist-tree .rc-tree-node-content-wrapper:focus-visible {
              outline: 2px solid var(--mantine-color-blue-5);
              outline-offset: -2px;
            }

            /* Disabled state */
            .minimalist-tree
              .rc-tree-treenode-disabled
              > .rc-tree-node-content-wrapper {
              opacity: 0.5;
              cursor: not-allowed;
            }

            .minimalist-tree
              .rc-tree-treenode-disabled
              > .rc-tree-node-content-wrapper:hover {
              background-color: transparent;
            }
          `}</style>

          <CollapsibleSection
            title="Projects"
            icon={IconFolder}
            isExpanded={true}
            noPadding
          >
            {renderTree(projectsTreeData, "No projects found.")}
          </CollapsibleSection>

          <CollapsibleSection
            title="Library"
            icon={IconFolders}
            isExpanded={true}
            noPadding
          >
            {renderTree(libraryTreeData, "No library items found.")}
          </CollapsibleSection>

          <CollapsibleSection
            title="Session"
            icon={IconSettings}
            isExpanded={true}
          >
            <Box pt="xs">
              <Text size="xs" fw={500} c="dimmed" mb="xs">
                Active Connections
              </Text>
              {connections.length > 0 ? (
                connections.map((conn) => (
                  <NavigationItem
                    key={conn.alias}
                    title={conn.alias}
                    icon={IconPlug}
                  />
                ))
              ) : (
                <NavigationItem title="No active connections" isSubtle />
              )}
              <Text size="xs" fw={500} c="dimmed" mt="md" mb="xs">
                Session Variables
              </Text>
              {variables.length > 0 ? (
                variables.map((varItem) => (
                  <NavigationItem
                    key={varItem.name}
                    title={varItem.name}
                    icon={IconVariable}
                  />
                ))
              ) : (
                <NavigationItem title="No session variables" isSubtle />
              )}
            </Box>
          </CollapsibleSection>
        </div>
      </ScrollArea>
      <ConnectionStatus onClick={onConnectionClick} />
    </aside>
  );
}
