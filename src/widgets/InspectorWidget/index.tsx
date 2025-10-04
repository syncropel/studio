// /home/dpwanjala/repositories/cx-studio/src/widgets/InspectorWidget/index.tsx
"use client";
import { Box, Title } from "@mantine/core";

export default function InspectorWidget() {
  return (
    <aside className="h-full w-full flex flex-col bg-gray-100 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
      <Box className="p-4 border-b border-gray-200 dark:border-gray-800">
        <Title order={4}>Inspector</Title>
      </Box>
      <Box p="md">Select a block to see its details.</Box>
    </aside>
  );
}
