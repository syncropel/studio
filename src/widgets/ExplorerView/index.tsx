// /home/dpwanjala/repositories/syncropel/studio/src/widgets/ExplorerView/index.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, Loader, Center, Title } from "@mantine/core";
import Tree, { type TreeNodeProps } from "rc-tree";
import type { EventDataNode, Key } from "rc-tree/lib/interface";
import {
  IconFileCode,
  IconFolder,
  IconChevronDown,
  IconChevronRight,
  IconFolderOpen,
} from "@tabler/icons-react";
import { useSessionStore, AssetTreeNode } from "@/shared/store/useSessionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";
import { ReadyState } from "react-use-websocket";

import CollapsibleSection from "@/widgets/SidebarWidget/CollapsibleSection";

/**
 * ExplorerView is a focused component responsible for displaying and managing
 * the user's active project files. It is the "Workbench" file browser.
 * All other concerns like Library, Session, or CX Home are handled by other views.
 */
export default function ExplorerView() {
  // This component only needs to know about the project tree data.
  const { currentPage, projectsTreeData, isWorkspaceLoading } =
    useSessionStore();

  const { sendJsonMessage, readyState } = useWebSocket();
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const selectedKeys = currentPage?.id ? [currentPage.id] : [];

  // This effect now correctly fetches ONLY the data needed for this view.
  useEffect(() => {
    if (readyState === ReadyState.OPEN && isWorkspaceLoading) {
      sendJsonMessage({
        type: "WORKSPACE.BROWSE",
        command_id: `browse-projects-${nanoid()}`,
        payload: { path: "projects://" },
      });
    }
  }, [readyState, isWorkspaceLoading, sendJsonMessage]);

  // Auto-expand parent folders when a page is selected.
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

  // Lazy-loading data for tree nodes (e.g., expanding a project folder).
  const onLoadData = useCallback(
    (treeNode: EventDataNode<AssetTreeNode>): Promise<void> => {
      const path = treeNode.key as string;
      return new Promise((resolve) => {
        if (treeNode.children && treeNode.children.length > 0) {
          resolve();
          return;
        }
        sendJsonMessage({
          type: "WORKSPACE.BROWSE",
          command_id: `browse-${path}-${nanoid()}`,
          payload: { path: path },
        });
        resolve();
      });
    },
    [sendJsonMessage]
  );

  // Handling clicks on tree nodes to load pages.
  const onSelect = useCallback(
    (
      _selectedKeys: React.Key[],
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
        // Toggle expansion on folder click
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

  // --- RENDER HELPERS for rc-tree ---
  const switcherIcon = (props: TreeNodeProps) => {
    if (props.isLeaf) return <span className="rc-tree-switcher-noop" />;
    if ((props.data as any)?.isLoadingChildren) return <Loader size={12} />;
    return props.expanded ? (
      <IconChevronDown size={14} className="text-gray-400" />
    ) : (
      <IconChevronRight size={14} className="text-gray-400" />
    );
  };

  const treeNodeIcon = (props: TreeNodeProps) => {
    const nodeData = props.data as AssetTreeNode;
    switch (nodeData.type) {
      case "project":
        return props.expanded ? (
          <IconFolderOpen size={16} className="text-blue-500" />
        ) : (
          <IconFolder size={16} className="text-blue-500" />
        );
      case "group":
        return props.expanded ? (
          <IconFolderOpen size={16} className="text-amber-500" />
        ) : (
          <IconFolder size={16} className="text-amber-500" />
        );
      case "flow":
        return <IconFileCode size={16} className="text-gray-500" />;
      default:
        return null;
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
          loadData={onLoadData}
          onSelect={onSelect}
          icon={treeNodeIcon}
          switcherIcon={switcherIcon}
          motion={null}
          showLine={false}
          itemHeight={28}
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
    <Box p="xs">
      <div className="minimalist-tree">
        {/* This full CSS block is required for correct indentation and styling. */}
        <style jsx global>{`
          .minimalist-tree .rc-tree-treenode {
            display: flex;
            align-items: center;
            padding: 0;
            margin: 0;
            min-height: 28px;
          }
          .minimalist-tree .rc-tree-node-content-wrapper {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 6px;
            margin: 1px 0;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.15s ease;
            color: inherit;
            width: 100%;
          }
          .minimalist-tree .rc-tree-node-content-wrapper:hover {
            background-color: var(--mantine-color-gray-1);
          }
          .dark .minimalist-tree .rc-tree-node-content-wrapper:hover {
            background-color: var(--mantine-color-dark-8);
          }
          .minimalist-tree .rc-tree-node-content-wrapper.rc-tree-node-selected {
            background-color: var(--mantine-color-blue-light-hover) !important;
            color: var(--mantine-color-blue-7);
            font-weight: 500;
          }
          .dark
            .minimalist-tree
            .rc-tree-node-content-wrapper.rc-tree-node-selected {
            background-color: var(--mantine-color-dark-6) !important;
            color: var(--mantine-color-blue-4);
          }
          .minimalist-tree .rc-tree-indent-unit {
            width: 20px;
          }
          .minimalist-tree .rc-tree-switcher,
          .minimalist-tree .rc-tree-switcher-noop {
            width: 20px;
            height: 28px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .minimalist-tree .rc-tree-iconEle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
            flex-shrink: 0;
            margin-right: 4px;
          }
          .minimalist-tree .rc-tree-title {
            font-size: 13px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            user-select: none;
          }
        `}</style>

        {/* The Explorer view now ONLY contains the Projects tree, keeping it clean and focused. */}
        <CollapsibleSection
          title="Projects"
          icon={IconFolder}
          isExpanded={true}
          noPadding
        >
          {renderTree(projectsTreeData, "No projects in workspace.")}
        </CollapsibleSection>
      </div>
    </Box>
  );
}
