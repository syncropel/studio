// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/index.tsx
"use client";

import React from "react";
import { Box, ScrollArea, Center, Text, Kbd } from "@mantine/core";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useSettingsStore } from "@/shared/store/useSettingsStore";
import DocumentView from "./views/DocumentView";
import GridView from "./views/GridView";
import GraphView from "./views/GraphView";

// A new component for our "Welcome Prompt"
const WelcomePrompt = () => (
  <Center h="100%">
    <Box ta="center">
      <Text size="xl" fw={500}>
        Syncropel Studio
      </Text>
      <Text c="dimmed" mt="sm">
        Press <Kbd>Ctrl+Shift+P</Kbd> or <Kbd>F1</Kbd> to open the Command
        Palette.
      </Text>
      <Text c="dimmed" mt="xs">
        Or, select a recent file from the Workspace navigator.
      </Text>
    </Box>
  </Center>
);

export default function Notebook() {
  const { currentPage } = useSessionStore();
  const { viewMode } = useSettingsStore();

  const renderView = () => {
    // If we have a page, use the perspective switcher.
    if (currentPage) {
      switch (viewMode) {
        case "grid":
          return <GridView />;
        case "graph":
          return <GraphView />;
        case "document":
        default:
          return <DocumentView />;
      }
    }

    // --- THIS IS THE KEY CHANGE ---
    // If there is NO current page, we are in the "shell" state.
    // We will render the DocumentView, which will show our welcome prompt.
    return <DocumentView />;
  };

  return (
    <Box className="h-full flex flex-col bg-white dark:bg-black">
      <ScrollArea className="flex-grow">
        {/* We remove the outer padding and header logic from here. 
              DocumentView will now manage its own header. */}
        {renderView()}
      </ScrollArea>
    </Box>
  );
}
