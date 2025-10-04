// /home/dpwanjala/repositories/cx-studio/src/widgets/TerminalWidget/index.tsx
"use client";
import { Box, Title } from "@mantine/core";

export default function TerminalWidget() {
  return (
    <Box className="h-full w-full flex flex-col bg-gray-100 dark:bg-gray-900">
      <Box className="p-2 border-b border-gray-200 dark:border-gray-800">
        <Title order={5}>Terminal</Title>
      </Box>
      <Box p="md" className="flex-grow">
        Terminal/Log Output will appear here.
      </Box>
    </Box>
  );
}
