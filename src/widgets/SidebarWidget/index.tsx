"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  ScrollArea,
  Text,
  Loader,
  Group,
  Title,
  Tooltip,
  ActionIcon,
  UnstyledButton,
  Center,
} from "@mantine/core";
import Tree, { type TreeNodeProps } from "rc-tree";
import type { EventDataNode, Key } from "rc-tree/lib/interface";
import {
  IconBox,
  IconFileCode,
  IconFolder,
  IconChevronDown,
  IconChevronRight,
  IconFolderOpen,
  IconFolders,
  IconSettings,
  IconPlug,
  IconVariable,
  IconHome,
  IconBuildingStore,
  IconKey,
} from "@tabler/icons-react";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";

import CollapsibleSection from "./CollapsibleSection";
import NavigationItem from "./NavigationItem";
import ConnectionStatus from "./ConnectionStatus";
import { ReadyState } from "react-use-websocket";
import { InboundMessage } from "@/shared/api/types";

interface AssetTreeNode {
  key: string;
  title: string;
  isLeaf: boolean;
  type: "project" | "group" | "flow" | "query" | "application";
  children?: AssetTreeNode[];
  isLoadingChildren?: boolean;
}

interface SidebarWidgetProps {
  onConnectionClick: () => void;
  disabled?: boolean;
}

export default function SidebarWidget({
  onConnectionClick,
  disabled = false,
}: SidebarWidgetProps) {
  const {
    connections,
    variables,
    setCurrentPage,
    lastJsonMessage,
    currentPage,
  } = useSessionStore();
  const { sendJsonMessage, readyState } = useWebSocket();
  const router = useRouter();

  const [projectsTreeData, setProjectsTreeData] = useState<AssetTreeNode[]>([]);
  const [libraryTreeData, setLibraryTreeData] = useState<AssetTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);

  const selectedKeys = currentPage?.id ? [currentPage.id] : [];

  const goToHome = () => {
    setCurrentPage(null);
    router.push("/");
  };
  const updateTreeDataWithChildren = useCallback(
    (
      list: AssetTreeNode[],
      key: React.Key,
      children: AssetTreeNode[]
    ): AssetTreeNode[] => {
      return list.map((node) => {
        if (node.key === key) {
          return { ...node, children, isLoadingChildren: false };
        }
        if (node.children) {
          return {
            ...node,
            children: updateTreeDataWithChildren(node.children, key, children),
          };
        }
        return node;
      });
    },
    []
  );

  // Effect to trigger the initial fetch of top-level projects
  useEffect(() => {
    // --- START: DEFINITIVE GUARD CLAUSE ---
    // Only attempt to fetch workspace data if the connection is open.
    if (readyState === ReadyState.OPEN && isLoading) {
      sendJsonMessage({
        type: "BROWSE_WORKSPACE",
        command_id: `browse-root-${nanoid()}`,
        payload: { path: "/" },
      });
    } else if (readyState !== ReadyState.CONNECTING) {
      // If we are not connecting and not open, we are disconnected, so stop loading.
      setIsLoading(false);
    }
    // --- END: DEFINITIVE GUARD CLAUSE ---
  }, [readyState, sendJsonMessage, isLoading]);

  // Effect to synchronize tree expansion with the active page
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

  // Effect to handle incoming WebSocket messages
  useEffect(() => {
    const message = lastJsonMessage as InboundMessage;
    if (message?.type === "WORKSPACE_BROWSE_RESULT") {
      const { path, data } = message.payload as any;

      if (path === "/") {
        setProjectsTreeData(data.projects || []);
        setLibraryTreeData(data.library || []);
      } else {
        const nodesForTree = data || [];
        if (path.startsWith("library/")) {
          setLibraryTreeData((origin) =>
            updateTreeDataWithChildren(origin, path, nodesForTree)
          );
        } else {
          setProjectsTreeData((origin) =>
            updateTreeDataWithChildren(origin, path, nodesForTree)
          );
        }
      }
      setIsLoading(false);
    } else if (message?.type === "PAGE_LOADED") {
      setCurrentPage(message.payload as any);
    }
  }, [lastJsonMessage, setCurrentPage, updateTreeDataWithChildren]);

  const onLoadData = useCallback(
    (treeNode: EventDataNode<AssetTreeNode>): Promise<void> => {
      return new Promise((resolve) => {
        if (treeNode.children) {
          resolve();
          return;
        }
        const treeToUpdate = treeNode.key.toString().startsWith("library/")
          ? setLibraryTreeData
          : setProjectsTreeData;
        treeToUpdate((origin) => {
          const updateLoadingState = (
            nodes: AssetTreeNode[]
          ): AssetTreeNode[] =>
            nodes.map((node) => {
              if (node.key === treeNode.key)
                return { ...node, isLoadingChildren: true };
              if (node.children)
                return { ...node, children: updateLoadingState(node.children) };
              return node;
            });
          return updateLoadingState(origin);
        });
        sendJsonMessage({
          type: "BROWSE_WORKSPACE",
          command_id: `browse-${treeNode.key}-${nanoid()}`,
          payload: { path: treeNode.key },
        });
        resolve();
      });
    },
    [sendJsonMessage]
  );

  const onSelect = useCallback(
    (
      selectedKeys: React.Key[],
      info: { node: EventDataNode<AssetTreeNode> }
    ) => {
      if (info.node.isLeaf) {
        const pageName = info.node.key as string;
        sendJsonMessage({
          type: "LOAD_PAGE",
          command_id: `load-page-${nanoid()}`,
          payload: { page_name: pageName },
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
    [sendJsonMessage, setExpandedKeys]
  );

  const switcherIcon = (props: TreeNodeProps) => {
    if (props.isLeaf) return null;
    const nodeData = props.data as AssetTreeNode;
    if (nodeData.isLoadingChildren)
      return <Loader size={12} className="mr-1" />;
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
          <IconFolderOpen size={14} className="text-blue-500" />
        ) : (
          <IconFolder size={14} className="text-blue-500" />
        );
      case "application":
        return <IconBuildingStore size={14} className="text-teal-500" />;
      case "group":
        return props.expanded ? (
          <IconFolderOpen size={14} className="text-gray-400" />
        ) : (
          <IconFolder size={14} className="text-gray-400" />
        );
      case "flow":
        return <IconFileCode size={14} className="text-gray-400" />;
      case "query":
        return <IconBox size={14} className="text-gray-400" />;
      default:
        return null;
    }
  };

  const renderTree = (data: AssetTreeNode[], placeholder: string) => {
    if (isLoading && data.length === 0) return <Loader size="xs" m="md" />;
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
    <aside
      className={`h-full w-full flex flex-col bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transition-opacity ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <Group
        justify="space-between"
        align="center"
        className="p-2 border-b border-gray-200 dark:border-gray-800 flex-shrink-0"
      >
        <Title order={4} className="px-2">
          Workspace
        </Title>
        <Tooltip label="Go to Homepage" position="right" withArrow>
          <ActionIcon variant="default" onClick={goToHome} size="md">
            <IconHome size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <ScrollArea className="flex-grow p-2">
        {disabled ? (
          <Center h={200}>
            <Text c="dimmed" size="sm">
              Connect to a server to view workspace.
            </Text>
          </Center>
        ) : (
          <div className="minimalist-tree">
            <style jsx global>{`
              .minimalist-tree .rc-tree {
                font-size: 13px;
                line-height: 1.5;
              }
              .minimalist-tree .rc-tree-treenode {
                padding: 0;
                margin: 0;
              }
              .minimalist-tree .rc-tree-node-content-wrapper {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 5px 8px;
                margin: 1px 0;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.15s ease;
                color: inherit;
                min-height: 28px;
                width: 100%;
              }
              .minimalist-tree .rc-tree-node-content-wrapper:hover {
                background-color: rgba(0, 0, 0, 0.03);
              }
              .minimalist-tree .dark .rc-tree-node-content-wrapper:hover {
                background-color: rgba(255, 255, 255, 0.05);
              }
              .minimalist-tree
                .rc-tree-node-content-wrapper.rc-tree-node-selected {
                background-color: rgba(59, 130, 246, 0.08) !important;
                color: rgb(59, 130, 246);
                font-weight: 500;
              }
              .minimalist-tree
                .dark
                .rc-tree-node-content-wrapper.rc-tree-node-selected {
                background-color: rgba(59, 130, 246, 0.12) !important;
              }
              .minimalist-tree .rc-tree-indent-unit {
                width: 20px;
                display: inline-block;
              }
              .minimalist-tree .rc-tree-switcher {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
                margin-right: 4px;
                flex-shrink: 0;
              }
              .minimalist-tree .rc-tree-iconEle {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
                flex-shrink: 0;
              }
              .minimalist-tree .rc-tree-title {
                display: inline-block;
                font-size: 13px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex-grow: 1;
              }
            `}</style>

            {/* --- PILLAR 1: PROJECTS --- */}
            <CollapsibleSection
              title="Projects"
              icon={IconFolder}
              isExpanded={true}
            >
              <Box pl={0}>
                {renderTree(projectsTreeData, "No projects found.")}
              </Box>
            </CollapsibleSection>

            {/* --- PILLAR 2: LIBRARY --- */}
            <CollapsibleSection
              title="Library"
              icon={IconFolders}
              isExpanded={true}
            >
              <Box pl={0}>
                {renderTree(libraryTreeData, "No library items found.")}
              </Box>
            </CollapsibleSection>

            {/* --- PILLAR 3: SESSION --- */}
            <CollapsibleSection
              title="Session"
              icon={IconSettings}
              isExpanded={true}
            >
              <Box pl="md" pt="xs">
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
        )}
      </ScrollArea>
      {/* --- PILLAR 4: SETTINGS HUB & STATUS --- */}
      <Box className="border-t border-gray-200 dark:border-gray-800 p-2">
        <CollapsibleSection
          title="Settings"
          icon={IconSettings}
          isExpanded={false}
        >
          <Box pl="md" pt="xs">
            <UnstyledButton
              onClick={onConnectionClick}
              className="w-full p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <Group gap="xs">
                <IconPlug size={14} className="text-gray-500" />
                <Text size="xs">Manage Connections</Text>
              </Group>
            </UnstyledButton>
            <NavigationItem title="Secrets" icon={IconKey} isSubtle={true} />
          </Box>
        </CollapsibleSection>
      </Box>
      <ConnectionStatus onClick={onConnectionClick} />
    </aside>
  );
}
