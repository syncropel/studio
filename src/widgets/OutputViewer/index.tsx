// /home/dpwanjala/repositories/syncropel/studio/src/widgets/OutputViewer/index.tsx
"use client";

import React, { useState, useMemo } from "react";
import {
  Loader,
  Text,
  Box,
  Group,
  Button,
  Paper,
  Tooltip,
  ActionIcon,
  Modal,
  Center,
} from "@mantine/core";
import {
  IconEye,
  IconDownload,
  IconAlertCircle,
  IconPin,
  IconPinnedOff,
  IconArrowsMaximize,
  IconX,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";

import { useArtifactQuery } from "@/shared/hooks/useArtifactQuery";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useSettingsStore } from "@/shared/store/useSettingsStore";
import type { BlockResult } from "@/shared/types/notebook";
import type {
  DataRef,
  SDUIPayload,
  InspectedArtifact,
} from "@/shared/api/types";
import DynamicUIRenderer from "./renderers/DynamicUIRenderer";

// Helper function to safely fetch artifact content
const fetchArtifactContent = (dataRef: DataRef) => {
  return fetch(
    new URL(dataRef.access_url, window.location.origin).toString()
  ).then((res) => {
    if (!res.ok) throw new Error(`Failed to fetch artifact: ${res.statusText}`);
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) return res.json();
    return res.text();
  });
};

// --- SUB-COMPONENT: ArtifactRenderer (Handles "Claim Checks") ---
const ArtifactRenderer = ({
  dataRef,
  blockId,
}: {
  dataRef: DataRef;
  blockId: string;
}) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const { data, isLoading, isError, error } = useArtifactQuery(
    dataRef,
    isEnabled
  );
  const { addInspectedArtifact, removeInspectedArtifact, inspectedArtifacts } =
    useSessionStore();
  const { isInspectorVisible, toggleInspector } = useSettingsStore();
  const queryClient = useQueryClient();
  const [isFocused, setIsFocused] = useState(false);

  const artifactId = `${blockId}-${dataRef.artifact_id}`;
  const isPinned = useMemo(
    () => inspectedArtifacts.some((art) => art.id === artifactId),
    [artifactId, inspectedArtifacts]
  );

  const handleDownload = () =>
    window.open(
      new URL(dataRef.access_url, window.location.origin).toString(),
      "_blank"
    );

  const handlePinToggle = async () => {
    if (isPinned) {
      removeInspectedArtifact(artifactId);
      if (inspectedArtifacts.length === 1 && isInspectorVisible)
        toggleInspector(false);
      return;
    }
    try {
      const content = await queryClient.fetchQuery({
        queryKey: ["artifact", dataRef.artifact_id],
        queryFn: () => fetchArtifactContent(dataRef),
      });
      const artifact: InspectedArtifact = {
        id: artifactId,
        runId: blockId,
        artifactName: dataRef.metadata?.file_name || `Output of ${blockId}`,
        content: content,
        type: dataRef.renderer_hint as any,
      };
      addInspectedArtifact(artifact);
      if (!isInspectorVisible) toggleInspector(true);
    } catch (e) {
      console.error("Failed to fetch artifact for pinning:", e);
    }
  };

  const contentWhenLoaded = useMemo(() => {
    if (!data) return null;
    const schema: SDUIPayload = {
      ui_component: dataRef.renderer_hint,
      props: { data },
    };
    return <DynamicUIRenderer schema={schema} />;
  }, [data, dataRef.renderer_hint]);

  const mainContent = useMemo(() => {
    if (data) return contentWhenLoaded;
    if (isLoading)
      return (
        <Center my="md">
          <Loader size="xs" />
        </Center>
      );
    if (isError)
      return (
        <Text c="red" size="sm">
          Error: {error.message}
        </Text>
      );

    // Initial "Claim Check" card
    return (
      <Group justify="space-between">
        <Box>
          <Text fw={500} size="sm">
            📄 Large Output Artifact
          </Text>
          <Text size="xs" c="dimmed">
            {dataRef.metadata?.record_count
              ? `${dataRef.metadata.record_count} records.`
              : "Data available."}
          </Text>
        </Box>
        <Group>
          <Button
            variant="default"
            size="xs"
            leftSection={<IconEye size={14} />}
            onClick={() => setIsEnabled(true)}
          >
            Load Data Inline
          </Button>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconDownload size={14} />}
            onClick={handleDownload}
          >
            Download
          </Button>
        </Group>
      </Group>
    );
  }, [data, isLoading, isError, dataRef, handleDownload, contentWhenLoaded]);

  return (
    <>
      <Paper withBorder p="md" radius="md" className="relative">
        {/* --- DEFINITIVE FIX: ADDED TOOLBAR TO ARTIFACT RENDERER --- */}
        <Group gap="xs" className="absolute top-2 right-2 z-10">
          <Tooltip
            label={isPinned ? "Un-pin from Data Tray" : "Pin to Data Tray"}
          >
            <ActionIcon variant="default" size="sm" onClick={handlePinToggle}>
              {isPinned ? <IconPinnedOff size={14} /> : <IconPin size={14} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Focus Output">
            <ActionIcon
              variant="default"
              size="sm"
              onClick={() => setIsFocused(true)}
            >
              <IconArrowsMaximize size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Close Output">
            <ActionIcon
              variant="default"
              size="sm"
              onClick={() =>
                useSessionStore.getState().clearBlockResult(blockId)
              }
            >
              <IconX size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* --- DEFINITIVE FIX: ADD PADDING WHEN TOOLBAR IS VISIBLE --- */}
        <Box pt={data ? "xl" : 0}>{mainContent}</Box>
      </Paper>
      <Modal
        opened={isFocused}
        onClose={() => setIsFocused(false)}
        size="90%"
        title={`Focused Output: ${blockId}`}
      >
        <Box style={{ maxHeight: "80vh", overflowY: "auto" }}>
          {contentWhenLoaded || mainContent}
        </Box>
      </Modal>
    </>
  );
};

// --- MAIN COMPONENT: OutputViewer ---
interface OutputViewerProps {
  blockResult: BlockResult | undefined;
}

export default function OutputViewer({ blockResult }: OutputViewerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const {
    clearBlockResult,
    addInspectedArtifact,
    removeInspectedArtifact,
    inspectedArtifacts,
  } = useSessionStore();
  const { isInspectorVisible, toggleInspector } = useSettingsStore();

  const blockId = (blockResult as any)?.block_id;

  const artifactId = useMemo(() => {
    if (blockResult?.status === "success" && blockResult.output.inline_data) {
      return `${blockId}-inline-success`;
    }
    return null; // data_ref is handled by ArtifactRenderer
  }, [blockResult, blockId]);

  const isPinned = useMemo(() => {
    if (!artifactId) return false;
    return inspectedArtifacts.some((art) => art.id === artifactId);
  }, [artifactId, inspectedArtifacts]);

  const handlePinToggle = () => {
    if (!artifactId) return;
    if (isPinned) {
      removeInspectedArtifact(artifactId);
      if (inspectedArtifacts.length === 1 && isInspectorVisible)
        toggleInspector(false);
      return;
    }

    if (blockResult?.status !== "success" || !blockResult.output.inline_data)
      return;

    const inlineData = blockResult.output.inline_data;
    let content: any = null;
    let type = "json";

    if (inlineData.props && "data" in inlineData.props) {
      content = (inlineData.props as { data: any }).data;
    } else {
      content = inlineData.props;
    }
    type = inlineData.ui_component;

    const artifact: InspectedArtifact = {
      id: artifactId,
      runId: blockId,
      artifactName: `Output of ${blockId}`,
      content,
      type: type as any,
    };
    addInspectedArtifact(artifact);
    if (!isInspectorVisible) toggleInspector(true);
  };

  const renderOutput = () => {
    if (!blockResult || blockResult.status === "pending") return null;

    switch (blockResult.status) {
      case "running":
        return (
          <Center my="md">
            <Loader size="xs" />
          </Center>
        );
      case "error":
        return (
          <Paper withBorder p="md" radius="md">
            <Group gap="xs" c="red" wrap="nowrap" align="flex-start">
              {" "}
              <IconAlertCircle
                size={16}
                style={{ flexShrink: 0, marginTop: 2 }}
              />{" "}
              <Text size="sm" ff="monospace" style={{ whiteSpace: "pre-wrap" }}>
                {blockResult.error.message || "An unknown error occurred."}
              </Text>{" "}
            </Group>
          </Paper>
        );
      case "success":
        if (blockResult.output?.inline_data) {
          return <DynamicUIRenderer schema={blockResult.output.inline_data} />;
        }
        if (blockResult.output?.data_ref) {
          return (
            <ArtifactRenderer
              dataRef={blockResult.output.data_ref}
              blockId={blockResult.block_id}
            />
          );
        }
        return (
          <Paper withBorder p="md" radius="md">
            <Text c="dimmed" size="sm">
              Success (no output).
            </Text>
          </Paper>
        );
      default:
        return null;
    }
  };

  const outputContent = renderOutput();
  if (!outputContent) return null;

  const isInlineData =
    blockResult?.status === "success" && blockResult.output.inline_data;
  const isErrorOrRunning =
    blockResult?.status === "error" || blockResult?.status === "running";

  // The main viewer only renders the toolbar for inline data. ArtifactRenderer handles its own.
  if (!isInlineData) {
    return outputContent;
  }

  return (
    <>
      <Paper withBorder p="md" radius="md" className="relative">
        {!isErrorOrRunning && (
          <Group gap="xs" className="absolute top-2 right-2 z-10">
            <Tooltip
              label={isPinned ? "Un-pin from Data Tray" : "Pin to Data Tray"}
            >
              <ActionIcon variant="default" size="sm" onClick={handlePinToggle}>
                {isPinned ? <IconPinnedOff size={14} /> : <IconPin size={14} />}
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Focus Output">
              <ActionIcon
                variant="default"
                size="sm"
                onClick={() => setIsFocused(true)}
              >
                <IconArrowsMaximize size={14} />
              </ActionIcon>
            </Tooltip>
            {blockId && (
              <Tooltip label="Close Output">
                <ActionIcon
                  variant="default"
                  size="sm"
                  onClick={() => clearBlockResult(blockId)}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        )}
        <Box pt="xl">{outputContent}</Box>
      </Paper>
      <Modal
        opened={isFocused}
        onClose={() => setIsFocused(false)}
        size="90%"
        title={`Focused Output for ${blockId}`}
      >
        <Box style={{ maxHeight: "80vh", overflowY: "auto" }}>
          {outputContent}
        </Box>
      </Modal>
    </>
  );
}
