// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/index.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic"; // --- NEW: Import dynamic from next/dynamic ---
import { Box, ScrollArea, Center, Loader } from "@mantine/core";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useSettingsStore } from "@/shared/store/useSettingsStore";

// --- START: DEFINITIVE FIX FOR SSR CRASH ---
// We now dynamically import DocumentView and explicitly disable Server-Side Rendering (SSR).
// This ensures the `monaco-editor` library, which depends on the `window` object,
// is only ever loaded and executed in the browser.
const DocumentView = dynamic(() => import("./views/DocumentView"), {
  ssr: false, // This is the crucial part
  loading: () => (
    <Center h="100%">
      <Loader />
    </Center>
  ),
});
// --- END: DEFINITIVE FIX ---

import GridView from "./views/GridView";
import GraphView from "./views/GraphView";

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

    // If there is NO current page, render the DocumentView which will
    // show its own internal "Welcome Prompt" state.
    return <DocumentView />;
  };

  return (
    <Box className="h-full flex flex-col bg-white dark:bg-black">
      {/* 
        The ScrollArea is now removed from here. The DocumentView and other
        views are now responsible for their own scrolling behavior to allow for
        more complex layouts like the fixed-header editor.
      */}
      {renderView()}
    </Box>
  );
}
