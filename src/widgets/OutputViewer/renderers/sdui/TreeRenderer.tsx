"use client";

import React, { useState, useMemo } from "react";
import Tree, { type TreeNodeProps } from "rc-tree";
import type { DataNode as RcTreeDataNode, Key } from "rc-tree/lib/interface";
import {
  IconFolder,
  IconFile,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";
import { Box, Text, Tooltip } from "@mantine/core";

// --- TYPE DEFINITIONS for SDUI Schema ---
// This defines the shape of the data we expect from the backend for a tree.
export interface TreeRendererNode extends RcTreeDataNode {
  key: string;
  title: string;
  isLeaf?: boolean;
  children?: TreeRendererNode[];
  icon?: string; // Optional icon name from a predefined set
  metadata?: Record<string, string>;
}

interface TreeRendererProps {
  data: TreeRendererNode[];
  title?: string; // An optional title for the whole tree
}

// --- MAIN COMPONENT ---
export default function TreeRenderer({ data, title }: TreeRendererProps) {
  // Automatically expand the first level of nodes by default
  const [expandedKeys, setExpandedKeys] = useState<Key[]>(() =>
    data.map((node) => node.key).filter(Boolean)
  );

  // Memoize the tree data to prevent unnecessary re-renders
  const treeData = useMemo(() => data, [data]);

  // --- CUSTOM RENDERERS FOR RC-TREE ---
  const iconRenderer = (props: TreeNodeProps) => {
    const nodeData = props.data as TreeRendererNode;
    // We can add more custom icons based on nodeData.icon later
    if (nodeData.isLeaf) {
      return <IconFile size={14} className="text-gray-500" />;
    }
    return <IconFolder size={14} className="text-blue-500" />;
  };

  const switcherIcon = (props: TreeNodeProps) => {
    if (props.isLeaf) {
      return null; // Don't render a switcher for leaf nodes in our minimalist style
    }
    return props.expanded ? (
      <IconChevronDown size={14} className="text-gray-400" />
    ) : (
      <IconChevronRight size={14} className="text-gray-400" />
    );
  };

  // Custom title renderer to show metadata in a tooltip
  const titleRenderer = (node: RcTreeDataNode) => {
    const nodeData = node as TreeRendererNode;
    if (nodeData.metadata && Object.keys(nodeData.metadata).length > 0) {
      const tooltipContent = Object.entries(nodeData.metadata)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      return (
        <Tooltip label={tooltipContent} withArrow position="right" multiline>
          <span>{nodeData.title}</span>
        </Tooltip>
      );
    }
    return <span>{nodeData.title}</span>;
  };

  return (
    <Box>
      {title && (
        <Text fw={500} mb="xs">
          {title}
        </Text>
      )}
      <div className="minimalist-tree">
        {/* Use the same minimalist styling as our main sidebar for consistency */}
        <style jsx global>{`
          .minimalist-tree .rc-tree {
            font-size: 13px;
          }
          .minimalist-tree .rc-tree-treenode {
            padding: 0;
            margin: 0;
          }
          .minimalist-tree .rc-tree-node-content-wrapper {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            margin: 1px 0;
            border-radius: 6px;
            min-height: 24px;
            width: 100%;
          }
          .minimalist-tree .rc-tree-indent-unit {
            width: 20px;
          }
          .minimalist-tree .rc-tree-switcher {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
            margin-right: 2px;
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
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        `}</style>
        <Tree
          treeData={treeData}
          expandedKeys={expandedKeys}
          onExpand={(keys) => setExpandedKeys(keys as Key[])}
          icon={iconRenderer}
          switcherIcon={switcherIcon}
          titleRender={titleRenderer}
          motion={null}
          showLine={false}
          itemHeight={24}
        />
      </div>
    </Box>
  );
}
