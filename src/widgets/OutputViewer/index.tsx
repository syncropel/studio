"use client";

import React, { useEffect } from "react";
import { Loader, Text, Box, Group, Button } from "@mantine/core";
import { IconEye, IconDownload } from "@tabler/icons-react";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";
import { BlockResult } from "@/shared/types/notebook";
import {
  ErrorPayload,
  InspectedArtifact,
  SDUIPayload,
} from "@/shared/api/types";
import DynamicUIRenderer from "./renderers/DynamicUIRenderer"; // The only renderer we need to import

interface OutputViewerProps {
  blockResult: BlockResult | null;
}

interface ArtifactCardProps {
  artifactName: string;
  runId: string;
  size?: number;
}

const ArtifactCard = ({ artifactName, runId, size }: ArtifactCardProps) => {
  const { toggleInspector } = useSessionStore();
  const { sendJsonMessage } = useWebSocket();

  const handlePreview = () => {
    toggleInspector(true);
    sendJsonMessage({
      type: "GET_ARTIFACT_CONTENT",
      command_id: `get-artifact-${nanoid()}`,
      payload: { run_id: runId, artifact_name: artifactName },
    });
  };

  const handleDownload = () => {
    alert(`TODO: Implement download for ${artifactName} from run ${runId}`);
  };

  return (
    <Box>
      <Group justify="space-between">
        <Box>
          <Text fw={500} size="sm">
            📄 {artifactName}
          </Text>
          {size && (
            <Text size="xs" c="dimmed">
              {(size / 1024).toFixed(2)} KB
            </Text>
          )}
        </Box>
        <Group>
          <Button
            variant="default"
            size="xs"
            leftSection={<IconEye size={14} />}
            onClick={handlePreview}
          >
            Preview
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
    </Box>
  );
};

export default function OutputViewer({ blockResult }: OutputViewerProps) {
  const { addInspectedArtifact, lastJsonMessage } = useSessionStore();

  useEffect(() => {
    if (
      lastJsonMessage?.type === "ARTIFACT_CONTENT_RESULT" &&
      lastJsonMessage.payload
    ) {
      const artifact = lastJsonMessage.payload as any;
      if (artifact && artifact.error) {
        console.error("Failed to fetch artifact content:", artifact.error);
      } else {
        addInspectedArtifact(artifact as InspectedArtifact);
      }
    }
  }, [lastJsonMessage, addInspectedArtifact]);

  const renderOutput = () => {
    if (!blockResult) return null;
    const { status, payload } = blockResult;

    switch (status) {
      case "pending":
        return null;
      case "running":
        return <Loader size="xs" />;
      case "error":
        const errorPayload = payload as ErrorPayload;
        return (
          <Text
            c="red"
            size="sm"
            ff="monospace"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {errorPayload?.error || "An unknown error."}
          </Text>
        );
      case "success":
        if (!payload) {
          return (
            <Text c="dimmed" size="sm">
              Success (no output).
            </Text>
          );
        }

        // --- THIS IS THE NEW, SIMPLIFIED LOGIC ---
        // The payload from the server is now ALWAYS an SDUI schema.
        // We just pass it to our intelligent renderer.
        // The logic to handle artifacts vs data is now implicitly handled
        // by the schema sent from the backend.
        return <DynamicUIRenderer schema={payload as SDUIPayload} />;
    }
    return null;
  };

  const outputContent = renderOutput();
  if (!outputContent) return null;

  return (
    <Box mt="md" p="md" className="bg-gray-100 dark:bg-gray-800 rounded-md">
      {outputContent}
    </Box>
  );
}
