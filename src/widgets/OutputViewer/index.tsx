"use client";

import React, { useState } from "react";
import { Loader, Text, Box, Group, Button, Paper } from "@mantine/core";
import { IconEye, IconDownload, IconAlertCircle } from "@tabler/icons-react";

// Custom hook for fetching artifact data via the Data Plane
import { useArtifactQuery } from "@/shared/hooks/useArtifactQuery";

// Definitive type definitions from our new, correct architecture
import type { BlockResult } from "@/shared/types/notebook";
import type { DataRef, SDUIPayload } from "@/shared/api/types";

// The intelligent renderer for all SDUI schemas
import DynamicUIRenderer from "./renderers/DynamicUIRenderer";

// ========================================================================
//   SUB-COMPONENT: ArtifactRenderer (Handles "Claim Checks")
// ========================================================================
// This component's sole responsibility is to handle a `data_ref` payload. It
// uses our custom `useArtifactQuery` hook to fetch large data artifacts on-demand.

const ArtifactRenderer = ({ dataRef }: { dataRef: DataRef }) => {
  // Local state to control when the query is enabled and should fire.
  const [isEnabled, setIsEnabled] = useState(false);

  // Use our custom React Query hook to manage the async data fetching.
  // It handles caching, loading states, and error states automatically.
  const { data, isLoading, isError, error } = useArtifactQuery(
    dataRef,
    isEnabled
  );

  const handleDownload = () => {
    // Open the secure artifact URL in a new tab to trigger a download.
    window.open(
      new URL(dataRef.access_url, window.location.origin).toString(),
      "_blank"
    );
  };

  // State 1: Data has been successfully loaded.
  if (data) {
    // Construct the appropriate SDUI schema from the fetched data and the hint.
    const schema: SDUIPayload = {
      ui_component: dataRef.renderer_hint,
      props: { data },
    };
    return <DynamicUIRenderer schema={schema} />;
  }

  // State 2: Data is currently being fetched.
  if (isLoading) {
    return <Loader size="xs" />;
  }

  // State 3: An error occurred during the fetch.
  if (isError) {
    return (
      <Text c="red" size="sm">
        Error loading artifact: {error.message}
      </Text>
    );
  }

  // State 4: The initial "Claim Check" card, waiting for user interaction.
  return (
    <Paper withBorder p="sm" radius="md">
      <Group justify="space-between">
        <Box>
          <Text fw={500} size="sm">
            📄 Large Output Artifact
          </Text>
          <Text size="xs" c="dimmed">
            {dataRef.metadata?.record_count
              ? `${dataRef.metadata.record_count} records`
              : "Data is available."}{" "}
            Click to load.
          </Text>
        </Box>
        <Group>
          <Button
            variant="default"
            size="xs"
            leftSection={<IconEye size={14} />}
            onClick={() => setIsEnabled(true)} // Enable and trigger the query on click.
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
    </Paper>
  );
};

// ========================================================================
//   MAIN COMPONENT: OutputViewer
// ========================================================================

interface OutputViewerProps {
  // This prop is now correctly typed to accept the new `BlockResult` union
  // or `undefined` if no result exists for a block yet.
  blockResult: BlockResult | undefined;
}

export default function OutputViewer({ blockResult }: OutputViewerProps) {
  /**
   * This is the core rendering logic. It uses a type-safe switch statement
   * to handle every possible state of a block's execution result.
   */
  const renderOutput = () => {
    // If there's no result, or the block is pending, render nothing.
    if (!blockResult || blockResult.status === "pending") {
      return null;
    }

    // This is a "discriminated union". TypeScript is smart enough to know
    // the exact shape of `blockResult` inside each `case` block.
    switch (blockResult.status) {
      case "running":
      case "skipped":
        return <Loader size="xs" />;

      case "error":
        // Here, TypeScript knows `blockResult` is of type `BlockErrorFields`.
        const { error } = blockResult;
        return (
          <Group gap="xs" c="red" wrap="nowrap" align="flex-start">
            <IconAlertCircle
              size={16}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <Text size="sm" ff="monospace" style={{ whiteSpace: "pre-wrap" }}>
              {error.message || "An unknown error occurred."}
            </Text>
          </Group>
        );

      case "success":
        // Here, TypeScript knows `blockResult` is of type `BlockOutputFields`.
        const { output } = blockResult;

        if (output?.inline_data) {
          // Case 1: Data is small and was sent inline in the WebSocket message.
          return <DynamicUIRenderer schema={output.inline_data} />;
        }
        if (output?.data_ref) {
          // Case 2: Data is large. Render the ArtifactRenderer to handle the "Claim Check".
          return <ArtifactRenderer dataRef={output.data_ref} />;
        }
        // Case 3: The block succeeded but produced no visual output.
        return (
          <Text c="dimmed" size="sm">
            Success (no output).
          </Text>
        );

      default:
        // This default case handles any unexpected statuses gracefully.
        return null;
    }
  };

  const outputContent = renderOutput();

  // Don't render the gray container box if there's nothing to show.
  if (!outputContent) {
    return null;
  }

  return (
    <Box mt="md" p="md" className="bg-gray-100 dark:bg-gray-800 rounded-md">
      {outputContent}
    </Box>
  );
}
