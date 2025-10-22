// /home/dpwanjala/repositories/syncropel/studio/src/widgets/SaveAsModal.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Button,
  TextInput,
  Stack,
  Text,
  UnstyledButton,
  Group,
  Box,
  ScrollArea,
} from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";
import { nanoid } from "nanoid";

import { useUIStateStore } from "@/shared/store/useUIStateStore";
import { useSessionStore, AssetTreeNode } from "@/shared/store/useSessionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { serializePageToText } from "@/shared/lib/serialization";

// Global reference to the editor instance, set by DocumentView
let editorInstance: any = null;
export const setEditorInstance = (editor: any) => {
  editorInstance = editor;
};

const FileTree = ({
  nodes,
  selectedPath,
  onSelect,
}: {
  nodes: AssetTreeNode[];
  selectedPath: string;
  onSelect: (path: string) => void;
}) => {
  return (
    <Stack gap={0}>
      {nodes.map((node) => (
        <Box key={node.key} pl={node.key.includes("/") ? "md" : 0}>
          <UnstyledButton
            onClick={() => !node.isLeaf && onSelect(node.key)}
            className={`w-full p-2 rounded-md ${
              selectedPath === node.key ? "bg-blue-50 dark:bg-blue-900/50" : ""
            }`}
            disabled={node.isLeaf}
          >
            <Group gap="xs">
              <IconFolder
                size={16}
                className={node.isLeaf ? "text-gray-400" : "text-blue-500"}
              />
              <Text size="sm" c={node.isLeaf ? "dimmed" : "inherit"}>
                {node.title}
              </Text>
            </Group>
          </UnstyledButton>
          {node.children && (
            <FileTree
              nodes={node.children}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          )}
        </Box>
      ))}
    </Stack>
  );
};

export default function SaveAsModal() {
  // This component is now controlled by the generic modalState
  const { closeModal } = useUIStateStore();
  const { projectsTreeData, currentPage } = useSessionStore();
  const { sendJsonMessage } = useWebSocket();

  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentPage) {
      const suggestedName = currentPage.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      setFileName(suggestedName);
    }
  }, [currentPage]);

  const folderTree = useMemo(() => {
    function filterFolders(nodes: AssetTreeNode[]): AssetTreeNode[] {
      return nodes
        .filter((node) => !node.isLeaf)
        .map((node) => ({
          ...node,
          children: node.children ? filterFolders(node.children) : [],
        }));
    }
    return filterFolders(projectsTreeData);
  }, [projectsTreeData]);

  const validateAndSetFileName = (name: string) => {
    setFileName(name);
    const invalidChars = /[\\/:"*?<>|]/;
    if (invalidChars.test(name)) {
      setError("File name contains invalid characters.");
    } else if (name.trim() === "") {
      setError("File name cannot be empty.");
    } else {
      setError(null);
    }
  };

  const handleSave = () => {
    if (error) return;
    if (
      !currentPage ||
      !selectedFolder ||
      !fileName.trim() ||
      !editorInstance
    ) {
      setError("Please select a folder and provide a file name.");
      return;
    }

    const editorContent = editorInstance.getValue();
    const finalFileName = fileName.endsWith(".cx.md")
      ? fileName
      : `${fileName}.cx.md`;
    const fullPath = `${selectedFolder}/${finalFileName}`;

    const pageToSerialize = {
      ...currentPage,
      name: currentPage.name || "Untitled",
    };
    const serializedContent = serializePageToText(
      pageToSerialize,
      editorContent
    );

    sendJsonMessage({
      type: "PAGE.SAVE",
      command_id: `save-as-${nanoid()}`,
      payload: {
        uri: fullPath,
        content: serializedContent,
        is_new: true,
      },
    });

    closeModal(); // Use the generic close action
  };

  return (
    <Stack>
      <Text size="sm">Select a destination folder:</Text>
      <ScrollArea h={250} className="border rounded-md p-2">
        <FileTree
          nodes={folderTree}
          selectedPath={selectedFolder}
          onSelect={setSelectedFolder}
        />
      </ScrollArea>
      <TextInput
        label="File name"
        placeholder="my-new-report"
        value={fileName}
        onChange={(e) => validateAndSetFileName(e.currentTarget.value)}
        disabled={!selectedFolder}
        rightSection={
          <Text size="sm" c="dimmed">
            .cx.md
          </Text>
        }
        error={error}
        autoFocus
      />
      {selectedFolder && fileName && !error && (
        <Text size="xs" c="dimmed">
          Full path: {selectedFolder}/
          {fileName.endsWith(".cx.md") ? fileName : `${fileName}.cx.md`}
        </Text>
      )}
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!selectedFolder || !fileName.trim() || !!error}
        >
          Save
        </Button>
      </Group>
    </Stack>
  );
}
