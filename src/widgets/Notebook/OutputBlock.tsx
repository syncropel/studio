// /home/dpwanjala/repositories/cx-studio/src/widgets/Notebook/OutputBlock.tsx
"use client";

import { Box, Text } from "@mantine/core";
import { useSessionStore } from "@/shared/store/useSessionStore";
import OutputViewer from "@/widgets/OutputViewer";

interface OutputBlockProps {
  blockId: string;
}

export default function OutputBlock({ blockId }: OutputBlockProps) {
  // Subscribe to the results for this specific block from the global store
  const blockResult = useSessionStore((state) => state.blockResults[blockId]);

  // If there's no result or status for this block yet, render nothing.
  if (!blockResult) {
    return null;
  }

  return (
    <Box
      mt="md"
      p="md"
      bg={{ base: "gray.0", dark: "dark.8" }}
      style={{ borderRadius: "var(--mantine-radius-md)" }}
    >
      <Box className="flex items-start">
        {/* The "Out:" label */}
        <Text
          size="xs"
          c="dimmed"
          mr="sm"
          fw={700}
          style={{ fontFamily: "monospace" }}
        >
          Out:
        </Text>

        {/* The main content area that will hold the viewer */}
        <Box className="flex-1 min-w-0">
          {/* 
            The OutputBlock's only job is to pass the entire result object
            to the OutputViewer. The OutputViewer is now the "smart" component
            that decides how to render the data based on its status and type.
          */}
          <OutputViewer blockResult={blockResult} />
        </Box>
      </Box>
    </Box>
  );
}
