// /home/dpwanjala/repositories/cx-studio/src/widgets/Notebook/index.tsx
"use client";

import React from "react";
import { Box, ScrollArea, Center, Text } from "@mantine/core";
import { useSessionStore } from "@/shared/store/useSessionStore";
import DocumentView from "./views/DocumentView";
import GridView from "./views/GridView";
import GraphView from "./views/GraphView";
import { useSettingsStore } from "@/shared/store/useSettingsStore";

export default function Notebook() {
  const { currentPage } = useSessionStore();

  const { viewMode } = useSettingsStore();

  const renderView = () => {
    switch (viewMode) {
      case "grid":
        return <GridView />;
      case "graph":
        return <GraphView />;
      case "document":
      default:
        return <DocumentView />;
    }
  };

  return (
    <Box className="h-full flex flex-col bg-white dark:bg-black">
      <ScrollArea className="flex-grow">
        {currentPage ? (
          <>
            {/* Render the view without extra padding */}
            {renderView()}
          </>
        ) : (
          <Center h="100%">
            <Text c="dimmed">
              No page selected. Please choose a notebook from the Workspace
              navigator.
            </Text>
          </Center>
        )}
      </ScrollArea>
    </Box>
  );
}
