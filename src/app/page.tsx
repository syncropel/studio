// /home/dpwanjala/repositories/cx-studio/src/app/page.tsx
"use client";

import { Loader, Center } from "@mantine/core";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useIsClient } from "@/shared/hooks/useIsClient";
import { useSessionStore } from "@/shared/store/useSessionStore";

import TopBar from "@/widgets/TopBar"; // <-- IMPORT TopBar
import SidebarWidget from "@/widgets/SidebarWidget";
import Notebook from "@/widgets/Notebook";
import InspectorWidget from "@/widgets/InspectorWidget";
import TerminalWidget from "@/widgets/TerminalWidget";

export default function StudioPage() {
  const isClient = useIsClient();

  // --- START OF NEW LOGIC: Get visibility state from the store ---
  const { isNavigatorVisible, isInspectorVisible, isTerminalVisible } =
    useSessionStore();
  // --- END OF NEW LOGIC ---

  if (!isClient) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return (
    <main className="h-screen w-screen flex flex-col bg-white dark:bg-black text-black dark:text-white">
      {/* --- ADD THE TOP BAR --- */}
      <TopBar />

      <div className="flex-grow">
        <PanelGroup direction="vertical">
          <Panel>
            <PanelGroup direction="horizontal">
              {/* --- START OF CONDITIONAL RENDERING --- */}
              {isNavigatorVisible && (
                <>
                  <Panel defaultSize={20} minSize={15} maxSize={40} order={1}>
                    <SidebarWidget />
                  </Panel>
                  <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
                </>
              )}

              <Panel order={2}>
                <Notebook />
              </Panel>

              {isInspectorVisible && (
                <>
                  <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
                  <Panel defaultSize={25} minSize={20} maxSize={50} order={3}>
                    <InspectorWidget />
                  </Panel>
                </>
              )}
              {/* --- END OF CONDITIONAL RENDERING --- */}
            </PanelGroup>
          </Panel>

          {isTerminalVisible && (
            <>
              <PanelResizeHandle className="h-1 bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
              <Panel defaultSize={25} minSize={20} maxSize={60}>
                <TerminalWidget />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </main>
  );
}
