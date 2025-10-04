// /home/dpwanjala/repositories/cx-studio/src/widgets/Notebook/index.tsx
"use client";

import React from "react";
import { Box, ScrollArea, Center, Text } from "@mantine/core";
import { useSessionStore } from "@/shared/store/useSessionStore";
import DocumentView from "./views/DocumentView";
import GridView from "./views/GridView";
import GraphView from "./views/GraphView";

export default function Notebook() {
  const { currentPage, viewMode } = useSessionStore();

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
        <Box p="xl">
          {currentPage ? (
            <>
              <Box mb="xl">
                <Text size="xl" fw={700}>
                  {currentPage.name}
                </Text>
                {currentPage.description && (
                  <Text c="dimmed">{currentPage.description}</Text>
                )}
              </Box>

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
        </Box>
      </ScrollArea>
    </Box>
  );
}
