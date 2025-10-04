// /home/dpwanjala/repositories/cx-studio/src/widgets/OutputViewer/index.tsx
"use client";

import React from "react";
import { Loader, Text } from "@mantine/core";
import JsonOutput from "./renderers/JsonOutput";
import TableOutput from "./renderers/TableOutput";
import { BlockResult } from "@/shared/types/notebook"; // Import the correct type
import { ErrorPayload } from "@/shared/types/server";

interface OutputViewerProps {
  // The component now accepts the full BlockResult type, or null
  blockResult: BlockResult | null;
}

export default function OutputViewer({ blockResult }: OutputViewerProps) {
  // If there's no result object at all, render nothing.
  if (!blockResult) {
    return null;
  }

  const { status, payload } = blockResult;

  // --- RENDER LOGIC ---

  // Handle the 'pending' state by rendering nothing. This is a clean state
  // before the user has run the block.
  if (status === "pending") {
    return null;
  }

  if (status === "running") {
    return <Loader size="xs" />;
  }

  if (status === "error") {
    const errorPayload = payload as ErrorPayload;
    return (
      <Text c="red" size="sm" ff="monospace" style={{ whiteSpace: "pre-wrap" }}>
        {errorPayload?.error || "An unknown error occurred."}
      </Text>
    );
  }

  if (status === "success") {
    if (payload === null || payload === undefined) {
      return (
        <Text c="dimmed">
          Command executed successfully with no data output.
        </Text>
      );
    }

    // --- RICH RENDERER DISPATCHER ---
    const isListOfDicts =
      Array.isArray(payload) &&
      payload.length > 0 &&
      typeof payload[0] === "object" &&
      payload[0] !== null;

    if (isListOfDicts) {
      return <TableOutput data={payload} />;
    }

    if (typeof payload === "object") {
      // Future: Check for UI components
      return <JsonOutput data={payload} />;
    }

    // Fallback for simple string or number results
    return (
      <Text ff="monospace" style={{ whiteSpace: "pre-wrap" }}>
        {String(payload)}
      </Text>
    );
  }

  // Fallback, should not be reached if all statuses are handled
  return null;
}
