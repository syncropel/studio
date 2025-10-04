"use client";

import React, { useState, useMemo } from "react";
import Tree, { type TreeNodeProps } from "rc-tree";
import type { DataNode as RcTreeDataNode } from "rc-tree/lib/interface";
import {
  IconFolder,
  IconFile,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";
import { Box, Text } from "@mantine/core";

import "rc-tree/assets/index.css";

export interface TreeOutputNode extends RcTreeDataNode {
  key: string;
  title: React.ReactNode; // Allow React nodes for titles
  isLeaf?: boolean;
  children?: TreeOutputNode[];
  nodeType?: string;
  metadata?: Record<string, any>;
}

interface TreeOutputProps {
  data: TreeOutputNode[];
  title?: string;
}

const TreeOutput: React.FC<TreeOutputProps> = ({ data, title }) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(() => {
    return data.map((node) => node.key).filter((key) => key !== undefined);
  });

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
  };

  const iconRenderer = (props: TreeNodeProps) => {
    const nodeData = props.data as TreeOutputNode;
    if (nodeData.isLeaf) {
      return <IconFile size={16} stroke={1.5} className="text-gray-500" />;
    }
    return <IconFolder size={16} stroke={1.5} className="text-blue-500" />;
  };

  const switcherIcon = (props: TreeNodeProps) => {
    if (props.isLeaf) {
      return <span style={{ width: "16px", display: "inline-block" }} />;
    }
    return props.expanded ? (
      <IconChevronDown size={16} stroke={1.5} className="text-gray-500" />
    ) : (
      <IconChevronRight size={16} stroke={1.5} className="text-gray-500" />
    );
  };

  // Custom title renderer to show metadata in a tooltip
  const titleRenderer = (node: TreeOutputNode) => {
    const tooltipText = node.metadata
      ? Object.entries(node.metadata)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n")
      : String(node.title);

    return <span title={tooltipText}>{node.title}</span>;
  };

  const treeData = useMemo(() => data, [data]);

  return (
    <Box className="font-sans">
      {title && (
        <Text fw={500} mb="xs">
          {title}
        </Text>
      )}
      <Tree
        treeData={treeData}
        expandedKeys={expandedKeys}
        onExpand={onExpand}
        icon={iconRenderer}
        switcherIcon={switcherIcon}
        titleRender={titleRenderer}
        showLine
        itemHeight={24}
        motion={null}
      />
    </Box>
  );
};

export default TreeOutput;
